from django.urls import path
from .views import (
    JobSearchView, SkillsAnalysisView, SalaryInsightView,
    TopCompaniesView, SupportedCountriesView,
    JSearchView, RemotiveView,
)

urlpatterns = [
    path('jobs/search/', JobSearchView.as_view(), name='job-search'),
    path('jobs/skills/', SkillsAnalysisView.as_view(), name='skills-analysis'),
    path('jobs/salary/', SalaryInsightView.as_view(), name='salary-insight'),
    path('jobs/companies/', TopCompaniesView.as_view(), name='top-companies'),
    path('jobs/countries/', SupportedCountriesView.as_view(), name='supported-countries'),
    path('jobs/africa/', JSearchView.as_view(), name='africa-jobs'),
    path('jobs/remote/', RemotiveView.as_view(), name='remote-jobs'),
]
