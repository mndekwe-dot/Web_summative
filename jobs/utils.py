import re

TECH_SKILLS = [
    'python', 'javascript', 'java', 'c++', 'c#', 'ruby', 'php', 'swift', 'kotlin',
    'typescript', 'scala', 'golang', 'rust', 'r',
    'react', 'angular', 'vue', 'node.js', 'django', 'flask', 'spring', 'express',
    'next.js', 'nuxt', 'fastapi', 'laravel',
    'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'sqlite',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ansible',
    'git', 'linux', 'bash', 'rest api', 'graphql', 'microservices',
    'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'pandas',
    'numpy', 'scikit-learn', 'data science', 'nlp',
    'html', 'css', 'sass', 'webpack', 'ci/cd', 'jenkins', 'github actions',
    'excel', 'tableau', 'power bi', 'spark', 'hadoop', 'kafka',
    'agile', 'scrum', 'jira', 'devops',
]

SOFT_SKILLS = [
    'communication', 'teamwork', 'leadership', 'problem solving', 'analytical',
    'project management', 'time management', 'collaboration', 'critical thinking',
    'attention to detail', 'adaptability', 'creativity', 'mentoring',
]


def extract_skills(descriptions):
    combined = ' '.join(descriptions).lower()

    skill_counts = {}
    for skill in TECH_SKILLS + SOFT_SKILLS:
        pattern = r'\b' + re.escape(skill) + r'\b'
        count = len(re.findall(pattern, combined))
        if count > 0:
            skill_counts[skill] = count

    sorted_skills = sorted(skill_counts.items(), key=lambda x: x[1], reverse=True)
    return [{'skill': skill, 'count': count} for skill, count in sorted_skills[:20]]


def format_salary(value):
    if value is None:
        return None
    return round(value, 2)
