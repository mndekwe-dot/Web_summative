from django.urls import path
from .views import JobSearchView, SkillsAnalysisView, SalaryInsightView, SupportedCountriesView

urlpatterns = [
    path('jobs/search/', JobSearchView.as_view(), name='job-search'),
    path('jobs/skills/', SkillsAnalysisView.as_view(), name='skills-analysis'),
    path('jobs/salary/', SalaryInsightView.as_view(), name='salary-insight'),
    path('jobs/countries/', SupportedCountriesView.as_view(), name='supported-countries'),
]
