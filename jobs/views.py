import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .utils import extract_skills

ADZUNA_BASE_URL = 'https://api.adzuna.com/v1/api/jobs'


def _adzuna_params(extra=None):
    params = {
        'app_id': settings.ADZUNA_APP_ID,
        'app_key': settings.ADZUNA_APP_KEY,
        'content-type': 'application/json',
    }
    if extra:
        params.update(extra)
    return params


def _handle_request_errors(exc):
    if isinstance(exc, requests.exceptions.ConnectionError):
        return Response(
            {'error': 'Unable to connect to the jobs API. Please try again later.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    if isinstance(exc, requests.exceptions.Timeout):
        return Response(
            {'error': 'The jobs API took too long to respond. Please try again.'},
            status=status.HTTP_504_GATEWAY_TIMEOUT,
        )
    if isinstance(exc, requests.exceptions.HTTPError):
        code = exc.response.status_code if exc.response is not None else 400
        return Response(
            {'error': f'Jobs API error: {exc}'},
            status=code,
        )
    return Response(
        {'error': 'An unexpected error occurred.'},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


class JobSearchView(APIView):
    """
    GET /api/jobs/search/
    Query params: query, country, page, salary_min, salary_max, full_time, sort_by, results_per_page
    """

    def get(self, request):
        query = request.query_params.get('query', '').strip()
        country = request.query_params.get('country', 'gb').strip().lower() or 'gb' or 'gb'
        page = request.query_params.get('page', '1')
        salary_min = request.query_params.get('salary_min', '').strip()
        salary_max = request.query_params.get('salary_max', '').strip()
        full_time = request.query_params.get('full_time', '')
        sort_by = request.query_params.get('sort_by', 'relevance')
        results_per_page = request.query_params.get('results_per_page', '20')

        if not query:
            return Response(
                {'error': 'Please provide a job title or keyword to search.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate page number
        try:
            page = max(1, int(page))
        except ValueError:
            page = 1

        # Validate results_per_page
        try:
            results_per_page = min(50, max(1, int(results_per_page)))
        except ValueError:
            results_per_page = 20

        params = _adzuna_params({
            'results_per_page': results_per_page,
            'what': query,
            'sort_by': sort_by,
        })

        if salary_min:
            try:
                params['salary_min'] = int(salary_min)
            except ValueError:
                pass

        if salary_max:
            try:
                params['salary_max'] = int(salary_max)
            except ValueError:
                pass

        if full_time == '1':
            params['full_time'] = 1

        try:
            url = f'{ADZUNA_BASE_URL}/{country}/search/{page}'
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            return Response(data)
        except (
            requests.exceptions.ConnectionError,
            requests.exceptions.Timeout,
            requests.exceptions.HTTPError,
        ) as exc:
            return _handle_request_errors(exc)


class SkillsAnalysisView(APIView):
    """
    GET /api/jobs/skills/
    Query params: query, country
    Returns top skills extracted from the first 50 matching job descriptions.
    """

    def get(self, request):
        query = request.query_params.get('query', '').strip()
        country = request.query_params.get('country', 'gb').strip().lower() or 'gb'

        if not query:
            return Response(
                {'error': 'Please provide a job title or keyword.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        params = _adzuna_params({
            'results_per_page': 50,
            'what': query,
        })

        try:
            url = f'{ADZUNA_BASE_URL}/{country}/search/1'
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            descriptions = [
                job.get('description', '') for job in data.get('results', [])
            ]
            skills = extract_skills(descriptions)

            return Response({
                'skills': skills,
                'total_jobs_analysed': len(descriptions),
                'total_jobs_available': data.get('count', 0),
            })
        except (
            requests.exceptions.ConnectionError,
            requests.exceptions.Timeout,
            requests.exceptions.HTTPError,
        ) as exc:
            return _handle_request_errors(exc)


class SalaryInsightView(APIView):
    """
    GET /api/jobs/salary/
    Query params: query, country
    Returns salary histogram data from Adzuna.
    """

    def get(self, request):
        query = request.query_params.get('query', '').strip()
        country = request.query_params.get('country', 'gb').strip().lower() or 'gb'

        if not query:
            return Response(
                {'error': 'Please provide a job title or keyword.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        params = _adzuna_params({'what': query})

        try:
            url = f'{ADZUNA_BASE_URL}/{country}/histogram'
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            return Response(response.json())
        except (
            requests.exceptions.ConnectionError,
            requests.exceptions.Timeout,
            requests.exceptions.HTTPError,
        ) as exc:
            return _handle_request_errors(exc)


class JSearchView(APIView):
    """
    GET /api/jobs/africa/
    Query params: query, location, page
    Searches LinkedIn/Indeed for jobs in Rwanda and Africa via JSearch (RapidAPI).
    """

    def get(self, request):
        query = request.query_params.get('query', '').strip()
        location = request.query_params.get('location', 'Rwanda').strip() or 'Rwanda'
        page = request.query_params.get('page', '1')

        if not query:
            return Response(
                {'error': 'Please provide a job title or keyword.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            page = max(1, int(page))
        except ValueError:
            page = 1

        headers = {
            'X-RapidAPI-Key': settings.RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
        }
        params = {
            'query': f'{query} in {location}',
            'page': page,
            'num_pages': 1,
            'date_posted': 'all',
        }

        try:
            response = requests.get(
                'https://jsearch.p.rapidapi.com/search',
                headers=headers,
                params=params,
                timeout=10,
            )
            response.raise_for_status()
            return Response(response.json())
        except (
            requests.exceptions.ConnectionError,
            requests.exceptions.Timeout,
            requests.exceptions.HTTPError,
        ) as exc:
            return _handle_request_errors(exc)


class RemotiveView(APIView):
    """
    GET /api/jobs/remote/
    Query params: search, category, limit
    Fetches remote jobs from Remotive — no API key required.
    """

    def get(self, request):
        search = request.query_params.get('search', '').strip()
        category = request.query_params.get('category', '').strip()
        limit = request.query_params.get('limit', '20')

        try:
            limit = min(100, max(1, int(limit)))
        except ValueError:
            limit = 20

        params = {'limit': limit}
        if search:
            params['search'] = search
        if category:
            params['category'] = category

        try:
            response = requests.get(
                'https://remotive.com/api/remote-jobs',
                params=params,
                timeout=15,
            )
            response.raise_for_status()
            return Response(response.json())
        except (
            requests.exceptions.ConnectionError,
            requests.exceptions.Timeout,
            requests.exceptions.HTTPError,
        ) as exc:
            return _handle_request_errors(exc)


class TopCompaniesView(APIView):
    """
    GET /api/jobs/companies/
    Query params: query, country
    Returns the top hiring companies for a given search from Adzuna.
    """

    def get(self, request):
        query = request.query_params.get('query', '').strip()
        country = request.query_params.get('country', 'gb').strip().lower() or 'gb'

        if not query:
            return Response(
                {'error': 'Please provide a job title or keyword.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        params = _adzuna_params({'what': query})

        try:
            url = f'{ADZUNA_BASE_URL}/{country}/top_companies'
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            return Response(response.json())
        except (
            requests.exceptions.ConnectionError,
            requests.exceptions.Timeout,
            requests.exceptions.HTTPError,
        ) as exc:
            return _handle_request_errors(exc)


class SupportedCountriesView(APIView):
    """
    GET /api/jobs/countries/
    Returns the list of countries supported by Adzuna.
    """

    def get(self, request):
        countries = [
            {'code': 'gb', 'name': 'United Kingdom'},
            {'code': 'us', 'name': 'United States'},
            {'code': 'au', 'name': 'Australia'},
            {'code': 'ca', 'name': 'Canada'},
            {'code': 'de', 'name': 'Germany'},
            {'code': 'fr', 'name': 'France'},
            {'code': 'nl', 'name': 'Netherlands'},
            {'code': 'za', 'name': 'South Africa'},
            {'code': 'nz', 'name': 'New Zealand'},
            {'code': 'br', 'name': 'Brazil'},
            {'code': 'in', 'name': 'India'},
            {'code': 'mx', 'name': 'Mexico'},
            {'code': 'sg', 'name': 'Singapore'},
            {'code': 'pl', 'name': 'Poland'},
            {'code': 'it', 'name': 'Italy'},
            {'code': 'ru', 'name': 'Russia'},
            {'code': 'at', 'name': 'Austria'},
            {'code': 'be', 'name': 'Belgium'},
        ]
        return Response(countries)
