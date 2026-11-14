# Family Finance Management System

> **Database Systems Project**  
> **Department of Artificial Intelligence (BS AI, Batch 25)**  
> **Dawood University of Engineering and Technology (DUET)**

---

## 📌 Project Overview

The **Family Finance Management System** is a full-stack database-driven application designed to help households track, manage, and optimize their shared finances. It provides multi-member visibility into income, expenses, category budgets, recurring bills, and long-term savings goals while ensuring strict financial data integrity through database constraints and atomic transactions.

---

## ✨ Key Features

- **Multi-Member Role Management:** Support for family roles (Admin, Earning Member, Dependent) with tailored visibility and access.
- **Account & Transaction Tracking:** Real-time tracking of family bank/cash accounts with atomic updates (inserting transaction and updating balances in a single ACID transaction).
- **Category-Based Budgeting:** Set monthly budget thresholds per category with automated warnings when approaching or exceeding limits.
- **Bills & Payment Schedules:** Manage recurring utility and family bills, track due dates, and prevent duplicate payments.
- **Savings Goals:** Define collective or individual savings targets and log incremental contributions.
- **Analytical Reports & Views:** Optimized SQL queries and views for monthly summaries, category breakdowns, and member-wise spending analysis.

---

## 🛠️ Technology Stack

| Layer          | Technology                                        | Purpose                                                                                                                                     |
| -------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Database**   | **PostgreSQL (NeonDB)**                           | Relational database with strict constraints (`CHECK`, `UNIQUE`, `FK`), `NUMERIC` types for monetary precision, and normalized schema (3NF). |
| **Backend**    | **FastAPI + SQLModel (SQLAlchemy)**               | High-performance asynchronous API layer with auto-generated interactive Swagger documentation (`/docs`).                                    |
| **Migrations** | **Alembic**                                       | Version-controlled database schema migrations.                                                                                              |
| **Frontend**   | **Next.js (TypeScript, Tailwind CSS, shadcn/ui)** | Modern, responsive dashboard and UI components.                                                                                             |
| **Analytics**  | **Raw SQL (`text()`) & PostgreSQL Views**         | Hand-written complex queries demonstrating `JOIN`, `GROUP BY`, CTEs, and aggregations for reporting.                                        |

---

## 📁 Project Structure

```text
family_finance_management_system/
├── backend/                  # FastAPI backend service
│   ├── database/             # Database connection & session setup
│   ├── schemas/              # SQLModel table definitions & schemas
│   ├── routers/              # API endpoints (members, expenses, budgets, etc.)
│   ├── sql/                  # Raw SQL queries & views for reports
│   └── main.py               # Application entry point
├── frontend/                 # Next.js frontend application
└── Project_Execution_Guide.docx # Detailed project implementation roadmap
```

---
