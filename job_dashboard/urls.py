from django.urls import path, include
from django.views.generic import TemplateView

urlpatterns = [
    path('', TemplateView.as_view(template_name='jobs/index.html'), name='home'),
    path('api/', include('jobs.urls')),
]
