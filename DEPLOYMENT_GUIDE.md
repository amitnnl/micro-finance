# 🚀 Kaspr Group Microfinance CRM — Web Hosting & Cloud Deployment Guide

This guide walks you step-by-step through deploying the full-stack Microfinance CRM application to **Hostinger (hPanel)**, **cPanel Shared Hosting**, or **Cloud VPS (Apache / Nginx)**.

---

## ⚡ Hostinger Fast Deployment (Recommended — Takes 2 Minutes)

We have already compiled and generated a complete, pre-configured production archive for you:
📁 **`hostinger-deploy.zip`** (0.17 MB, located in this project root)

### Method 1: Upload via Hostinger hPanel File Manager (Fastest & Easiest)
1. Log into your **Hostinger Dashboard (hPanel)**: [https://hpanel.hostinger.com](https://hpanel.hostinger.com).
2. Click on **Websites** -> Select your domain -> Click **Manage**.
3. Under **Files**, click **File Manager** (or access `public_html`).
4. Click the **Upload** icon (top right) -> Select `File` -> choose `hostinger-deploy.zip` from your project folder:
   ```
   C:\xampp\htdocs\micro-fin\hostinger-deploy.zip
   ```
5. Once uploaded, right-click `hostinger-deploy.zip` and select **Extract**.
   - Choose `public_html/` as the extract directory.
   - Click **Extract**. All files (`.htaccess`, `index.php`, `.env`, `assets/`, `backend/`, `database/`) will be extracted instantly.
6. Delete `hostinger-deploy.zip` to keep your storage clean.

### Method 2: Deploy from Terminal via FTP Script
You can also run the deployment script directly from your terminal:
```powershell
powershell -ExecutionPolicy Bypass -File .\deploy-hostinger.ps1
```
*(It will ask for your Hostinger FTP Host, Username, and Password found in Hostinger hPanel -> **Files -> FTP Accounts**).*

---

### 🗄️ Hostinger Database Setup (3 Steps):
1. In Hostinger hPanel, search for **Databases** (under **Databases -> Management**).
2. Create a new MySQL Database:
   - Database name: e.g. `u123456789_microfin`
   - Username: e.g. `u123456789_admin`
   - Password: (Enter a secure password)
3. Click **Enter phpMyAdmin** beside your newly created database:
   - Click the **Import** tab at the top.
   - Choose file: `database/database.sql` (from extracted files).
   - Click **Go / Import**.
4. In Hostinger **File Manager**, open `.env` (or `backend/config/db_config.php`) and update your database credentials:
   ```ini
   DB_HOST=localhost
   DB_NAME=u123456789_microfin
   DB_USER=u123456789_admin
   DB_PASS=YourStrongPasswordHere
   ```
5. **Done!** Open `https://yourdomain.com/` in your browser.
   - Default Login: **`admin@kaspr.com`**
   - Default Password: **`admin123`**

---

## 📋 System Prerequisites

| Component | Minimum Requirement | Recommended |
| :--- | :--- | :--- |
| **PHP** | PHP 7.4+ (PDO, OpenSSL, mbstring, json enabled) | PHP 8.1 / 8.2 |
| **Database** | MySQL 5.7+ / MariaDB 10.3+ | MySQL 8.0+ |
| **Web Server** | Apache with `mod_rewrite` & `mod_headers` OR Nginx | Apache 2.4+ |
| **SSL / HTTPS** | Free Let's Encrypt or Custom SSL Certificate | Recommended for production |

---

## 🗄️ Step 1: Database Setup

1. Log into your hosting control panel (**cPanel** or **phpMyAdmin**).
2. Create a new MySQL Database (e.g., `kaspr_microfin`).
3. Create a MySQL User and assign a strong password.
4. Add the User to the Database with **ALL PRIVILEGES**.
5. Open **phpMyAdmin**, click on your newly created database, and go to the **Import** tab.
6. Select and upload the schema file:
   ```
   database/database.sql
   ```
7. Click **Go / Import**. All tables (`users`, `loans`, `emis`, `leads`, `appointments`, `documents`, `settings`) will be created along with default administrative accounts.

---

## 📁 Step 2: Upload Files to Server

You can upload the application files using **cPanel File Manager** or **SFTP/FTP (FileZilla)**.

### Target Directory:
- **Primary Domain (e.g. `https://crm.yourcompany.com`):**  
  Upload directly inside `public_html/`
- **Subfolder (e.g. `https://yourcompany.com/micro-fin/`):**  
  Upload inside `public_html/micro-fin/`

### What to Upload:
Upload the following folders and files from the project directory:
```
├── .htaccess                 <- Root Apache rewrite rules and security
├── .env.example              <- Sample environment file
├── index.php                 <- Root entry point that serves the React frontend
├── assets/                   <- Production compiled CSS and JS bundles
├── favicon.svg               <- Fintech app icon
├── backend/                  <- REST API, controllers, and models
│   ├── .htaccess             <- Backend protection
│   ├── api/                  <- Public router (index.php)
│   ├── config/               <- Database & CORS configs
│   ├── controllers/          <- Business logic
│   ├── helpers/              <- JWT and Response helpers
│   └── models/               <- Database models
├── database/                 <- SQL schema migrations
└── frontend/dist/            <- Built production bundle (mirrored with root)
```

> **Tip:** You do **NOT** need to upload `node_modules` or `frontend/node_modules` to your web server. The frontend is already compiled into high-performance, minified static bundles in `assets/` and `frontend/dist/`.

---

## ⚙️ Step 3: Configure Database Credentials

You can configure your database in either of two easy ways:

### Option A: Via `.env` file (Recommended)
1. In your uploaded root directory, copy `.env.example` to `.env`.
2. Edit `.env` with your hosting database credentials:
   ```ini
   DB_HOST=localhost
   DB_NAME=your_cpanel_dbname
   DB_USER=your_cpanel_dbuser
   DB_PASS=your_cpanel_dbpassword
   
   JWT_SECRET=KasprGroup_SuperSecret_JWT_Key_2026_SecureFintechToken!
   APP_ENV=production
   ```

### Option B: Via PHP Config file (Alternative for hosts restricting dotfiles)
1. Go to `backend/config/`.
2. Copy `db_config.example.php` to `db_config.php`.
3. Open `db_config.php` and fill in your credentials:
   ```php
   return [
       'DB_HOST' => 'localhost',
       'DB_NAME' => 'your_cpanel_dbname',
       'DB_USER' => 'your_cpanel_dbuser',
       'DB_PASS' => 'your_cpanel_dbpassword',
   ];
   ```

---

## 🔒 Step 4: File Permissions & Security

Ensure appropriate file permissions on your server:
- **Folders:** `755` (`drwxr-xr-x`)
- **PHP Files:** `644` (`-rw-r--r--`)
- **.env file:** `600` or `640` (so it cannot be browsed directly)

The included `.htaccess` automatically prevents direct browser access to `.env`, `.sqlite`, `.git`, and all backend subfolders except `backend/api/`.

---

## 🌐 Step 5: Nginx Configuration (Only if NOT using Apache)

If you are deploying on a Linux VPS with **Nginx** instead of Apache, add this to your Nginx server block:

```nginx
server {
    listen 80;
    server_name crm.yourcompany.com;
    root /var/www/micro-fin;
    index index.php index.html;

    # Pass API requests to PHP-FPM
    location /backend/api/ {
        try_files $uri $uri/ /backend/api/index.php?$args;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_param HTTP_AUTHORIZATION $http_authorization;
    }

    # Block access to internal folders and sensitive files
    location ~ ^/(backend/(config|controllers|helpers|models)|\.env|\.git) {
        deny all;
    }

    # SPA Routing Fallback
    location / {
        try_files $uri $uri/ /index.php?$args;
    }
}
```

---

## 🔑 Step 6: Initial Login & Verification

1. Open your browser and navigate to your website:
   - Example: `https://crm.yourcompany.com/#/login` or `https://yourcompany.com/micro-fin/#/login`
2. Log in with the default administrator credentials:
   - **Email:** `admin@kaspr.com`
   - **Password:** `admin123`
3. Upon login, you will land on the executive CRM dashboard with live KPIs, loans, EMI schedules, and customer CRM tools.
4. Go to **Settings** or **Users** in the sidebar to change your administrator password and customize your organization profile.

---

## 🛠️ Need to Update or Rebuild the Frontend Later?

If you ever make design or code changes in `frontend/src/`:
1. On your local machine, run:
   ```bash
   cd frontend
   npm run build
   ```
2. Upload the updated files from `frontend/dist/assets/` to your server's `assets/` and `frontend/dist/assets/` folders.
3. Refresh your browser (Ctrl+F5) to see the changes instantly!
