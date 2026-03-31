# KORA — Rwanda & Africa Job Market Dashboard

KORA (meaning "Work" in Kinyarwanda) is a web application that helps job seekers find employment opportunities in Rwanda, across Africa, and remote positions worldwide. Built with Django REST Framework and powered by multiple job APIs.

**Live URL:** https://jobs.imboni.tech

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [APIs Used](#apis-used)
- [Tech Stack](#tech-stack)
- [Running Locally](#running-locally)
- [Deployment](#deployment)
- [Load Balancer Configuration](#load-balancer-configuration)
- [Challenges](#challenges)
- [Credits](#credits)

---

## Project Overview

KORA is a job market dashboard designed with Rwanda and Africa in mind. It aggregates real job listings from multiple sources and presents them in an easy-to-use interface. Users can search for jobs globally, filter by African country, or find remote positions they can work from anywhere in Rwanda.

The application provides three core modes:
- **Global Jobs** — Search worldwide job listings with salary filters and skill analysis
- **Africa & Rwanda** — Find jobs specifically in Rwanda and other African countries
- **Remote Jobs** — Discover remote-first companies hiring globally

---

## Features

- Search jobs by title, keyword, and location
- Filter by salary range, job type (full-time), and country
- Sort results by relevance or latest date
- Quick-pick popular job roles dropdown (including Africa-specific roles)
- Top Skills in Demand chart (extracted from job descriptions)
- Salary Distribution histogram
- Top Hiring Companies leaderboard
- Detailed job modal with apply link
- Pagination for browsing results
- Full error handling for API downtime and invalid responses
- Responsive design with Rwanda flag colour theme
- About section with developer profile and project story

---

## APIs Used

### 1. Adzuna Jobs API
- **Purpose:** Global job search, salary insights, top companies
- **Documentation:** https://developer.adzuna.com/docs/search
- **Free tier:** 250 requests/day
- **Endpoints used:**
  - `/jobs/{country}/search/{page}` — Job search
  - `/jobs/{country}/histogram` — Salary distribution
  - `/jobs/{country}/top_companies` — Top hiring companies

### 2. JSearch API (via RapidAPI)
- **Purpose:** Africa & Rwanda job search (aggregates LinkedIn, Indeed, Glassdoor)
- **Documentation:** https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
- **Free tier:** 200 requests/month
- **Endpoint used:**
  - `/search` — Job search with location filter

### 3. Remotive API
- **Purpose:** Remote job listings (no API key required)
- **Documentation:** https://remotive.com/api
- **Free tier:** Unlimited
- **Endpoint used:**
  - `/remote-jobs` — Remote job search by keyword and category

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 4.2, Django REST Framework |
| Frontend | HTML, CSS, JavaScript |
| Charts | Chart.js |
| Static files | WhiteNoise |
| Production server | Gunicorn |
| Load balancer | HAProxy |
| Database | SQLite |

---

## Running Locally

### Prerequisites
- Python 3.8+
- Git

### Steps

**1. Clone the repository:**
```bash
git clone https://github.com/mndekwe-dot/Web_summative.git
cd Web_summative
```

**2. Create and activate virtual environment:**
```bash
python3 -m venv venv

# Linux/Mac
source venv/bin/activate

# Windows
venv\Scripts\activate
```

**3. Install dependencies:**
```bash
pip install -r requirements.txt
```

**4. Create `.env` file:**
```bash
cp .env.example .env
```

Edit `.env` and fill in your API keys:
```env
SECRET_KEY=your-django-secret-key
DEBUG=True
ADZUNA_APP_ID=your-adzuna-app-id
ADZUNA_APP_KEY=your-adzuna-app-key
RAPIDAPI_KEY=your-rapidapi-key
ALLOWED_HOSTS=localhost,127.0.0.1
```

**Get API keys:**
- Adzuna: https://developer.adzuna.com — free registration
- JSearch (RapidAPI): https://rapidapi.com — search "JSearch" by OpenWeb Ninja
- Remotive: No key needed

**5. Run migrations:**
```bash
python manage.py migrate
```

**6. Start the development server:**
```bash
python manage.py runserver
```

**7. Open in browser:**
```
http://localhost:8000
```

---

## Deployment

The application is deployed on two Ubuntu web servers behind a HAProxy load balancer.

### Server Information

| Server | IP Address | Domain | Role |
|---|---|---|---|
| web-01 | 44.203.152.117 | web-01.imboni.tech | App Server 1 |
| web-02 | 54.167.139.121 | web-02.imboni.tech | App Server 2 |
| lb-01 | 44.202.26.45 | jobs.imboni.tech | Load Balancer |

### Deploying to Web Servers (web-01 and web-02)

Run the following steps on **both** web servers:

**1. SSH into the server:**
```bash
ssh -i ~/.ssh/school ubuntu@44.203.152.117
# For web-02: ssh -i ~/.ssh/school ubuntu@54.167.139.121
```

**2. Install dependencies:**
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv git
```

**3. Clone the repository:**
```bash
cd /home/ubuntu
git clone https://github.com/mndekwe-dot/Web_summative.git
cd Web_summative
```

**4. Setup virtual environment:**
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**5. Create `.env` file:**
```bash
nano .env
```
```env
SECRET_KEY=your-secret-key
DEBUG=False
ADZUNA_APP_ID=your-adzuna-app-id
ADZUNA_APP_KEY=your-adzuna-app-key
RAPIDAPI_KEY=your-rapidapi-key
ALLOWED_HOSTS=44.203.152.117,54.167.139.121,44.202.26.45,jobs.imboni.tech,localhost
```

**6. Setup database and static files:**
```bash
python manage.py migrate
python manage.py collectstatic --noinput
```

**7. Create Gunicorn systemd service:**
```bash
sudo nano /etc/systemd/system/kora.service
```
```ini
[Unit]
Description=KORA Gunicorn Daemon
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/Web_summative
EnvironmentFile=/home/ubuntu/Web_summative/.env
ExecStart=/home/ubuntu/Web_summative/venv/bin/gunicorn \
          job_dashboard.wsgi:application \
          --bind 0.0.0.0:8000 \
          --workers 3
Restart=always

[Install]
WantedBy=multi-user.target
```

**8. Start and enable the service:**
```bash
sudo systemctl daemon-reload
sudo systemctl start kora
sudo systemctl enable kora
sudo systemctl status kora
```

### Updating the Application

To deploy new changes to the servers:
```bash
cd /home/ubuntu/Web_summative
git pull origin master
source venv/bin/activate
python manage.py collectstatic --noinput
sudo systemctl restart kora
```

---

## Load Balancer Configuration

The load balancer uses **HAProxy** on lb-01 to distribute traffic between web-01 and web-02. HTTPS is enabled using a free Let's Encrypt SSL certificate for `jobs.imboni.tech`.

### SSL Certificate Setup (Let's Encrypt)

Run the following on lb-01:

```bash
# Install certbot
sudo apt install -y certbot

# Stop HAProxy briefly to free port 80
sudo systemctl stop haproxy

# Obtain certificate for jobs.imboni.tech
sudo certbot certonly --standalone -d jobs.imboni.tech

# Restart HAProxy
sudo systemctl start haproxy

# Combine cert + key into a single PEM file for HAProxy
sudo cat /etc/letsencrypt/live/jobs.imboni.tech/fullchain.pem \
         /etc/letsencrypt/live/jobs.imboni.tech/privkey.pem \
| sudo tee /etc/haproxy/certs/jobs.imboni.tech.pem
```

### HAProxy Configuration

Full configuration (`/etc/haproxy/haproxy.cfg`):

```haproxy
global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    daemon
    tune.ssl.default-dh-param 2048

defaults
    log global
    mode http
    option httplog
    option dontlognull
    timeout connect 5000
    timeout client 50000
    timeout server 50000
    errorfile 400 /etc/haproxy/errors/400.http
    errorfile 403 /etc/haproxy/errors/403.http
    errorfile 408 /etc/haproxy/errors/408.http
    errorfile 500 /etc/haproxy/errors/500.http
    errorfile 502 /etc/haproxy/errors/502.http
    errorfile 503 /etc/haproxy/errors/503.http
    errorfile 504 /etc/haproxy/errors/504.http

frontend www-http
    bind *:80
    acl is_jobs hdr(host) -i jobs.imboni.tech
    redirect scheme https code 301 if is_jobs
    default_backend web-backend

frontend www-https
    bind *:443 ssl crt /etc/haproxy/certs/www.imboni.tech.pem crt /etc/haproxy/certs/jobs.imboni.tech.pem
    http-request add-header X-Forwarded-Proto https
    acl is_jobs hdr(host) -i jobs.imboni.tech
    use_backend kora-backend if is_jobs
    default_backend web-backend

backend kora-backend
    balance roundrobin
    server web-01 44.203.152.117:8000 check
    server web-02 54.167.139.121:8000 check

backend web-backend
    balance roundrobin
    server web-01 44.203.152.117:80 check
    server web-02 54.167.139.121:80 check
```

**How it works:**
- HTTP requests to `jobs.imboni.tech` are automatically redirected to HTTPS (301)
- HTTPS requests are routed to the `kora-backend` (web-01 and web-02 on port 8000)
- HAProxy uses **round-robin** load balancing — each request alternates between web-01 and web-02
- If one server goes down, HAProxy automatically routes all traffic to the healthy server
- Two SSL certificates are loaded: one for `www.imboni.tech` (existing) and one for `jobs.imboni.tech` (new)
- The `X-Forwarded-Proto: https` header is added so Django knows the connection is secure

**Apply config changes:**
```bash
sudo haproxy -c -f /etc/haproxy/haproxy.cfg
sudo systemctl restart haproxy
```

---

## Challenges

### 1. API Key Security
**Challenge:** Keeping API keys out of the GitHub repository while making them available on the server.
**Solution:** Used `python-dotenv` to load keys from a `.env` file. The `.env` file is listed in `.gitignore` so it is never committed.

### 2. Port Conflicts on Load Balancer
**Challenge:** The load balancer already had HAProxy running on port 80 for a previous assignment.
**Solution:** Instead of running a separate Nginx instance (which caused conflicts), we added KORA as a new backend inside the existing HAProxy configuration using ACL rules based on the hostname.

### 3. Python Version Confusion
**Challenge:** Ubuntu server had both Python 2 and Python 3 installed. Running `python` defaulted to Python 2, causing syntax errors with Django.
**Solution:** Used `python3` explicitly and set up a virtual environment where `python` correctly pointed to Python 3.

### 4. Static Files in Production
**Challenge:** Django does not serve static files when `DEBUG=False`.
**Solution:** Added WhiteNoise middleware which allows Django/Gunicorn to serve static files efficiently in production without needing a separate web server configuration.

### 5. Rwanda/Africa API Coverage
**Challenge:** The Adzuna API does not cover Rwanda or most African countries.
**Solution:** Integrated JSearch API (via RapidAPI) which aggregates LinkedIn and Indeed — both of which have job listings in Rwanda and East Africa. Added Remotive API for remote jobs accessible to Rwandan professionals.

### 6. HTTPS / SSL Configuration
**Challenge:** The load balancer already had an SSL certificate for `www.imboni.tech` but `jobs.imboni.tech` needed its own certificate. HAProxy was occupying port 80, which certbot needs for domain verification.
**Solution:** Stopped HAProxy briefly (under 30 seconds), obtained a free Let's Encrypt certificate using certbot standalone mode, combined the cert and key into a single PEM file, and configured HAProxy to load both certificates. HTTP traffic to `jobs.imboni.tech` is now automatically redirected to HTTPS via a 301 redirect rule.

---

## Credits

| Resource | Link |
|---|---|
| Adzuna Jobs API | https://developer.adzuna.com |
| JSearch API by OpenWeb Ninja | https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch |
| Remotive API | https://remotive.com/api |
| Django | https://www.djangoproject.com |
| Django REST Framework | https://www.django-rest-framework.org |
| Chart.js | https://www.chartjs.org |
| WhiteNoise | https://whitenoise.readthedocs.io |
| Gunicorn | https://gunicorn.org |
| HAProxy | https://www.haproxy.org |

---

## Repository

GitHub: https://github.com/mndekwe-dot/Web_summative

## Demo Video

[[Link to demo video]](https://www.youtube.com/watch?v=xEHSGfZGyHE)
