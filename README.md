# Wedding Accounts Hub

Build a full project-based accounting web app for JOG MEDIA, a wedding photography and videography business in Kozhikode, Kerala, India.

The app must manage every wedding as a project and also work as a proper accounting system.

Create a clean, mobile-friendly, professional UI in English with simple labels.

Core modules: Dashboard, Clients, Projects, Payments, Expenses, Tasks, Staff, Delivery, Accounts, Reports, Settings.

Project management requirements:

Store client name, phone, WhatsApp, email, address, event date, venue, package name, total agreed amount, advance amount, balance due, payment status, project status, shoot status, editing status, album status, delivery status, notes.

Allow multiple payments per project.

Allow multiple expenses per project.

Allow multiple tasks per project.

Assign multiple staff to a project.

Show project timeline and checklist.

Add quick actions for call, WhatsApp, add payment, add expense, and mark delivery complete.

Accounting requirements:

Include Chart of Accounts.

Include journal entries with debit and credit lines.

Track income, expenses, assets, liabilities, and equity.

Generate Profit & Loss report.

Generate Balance Sheet report.

Generate Cash Flow report.

Support date-range filters for all reports.

Support accrual and cash basis where possible.

Show project-wise profitability and monthly profitability.

Reports requirements:

Profit & Loss report must show income, direct costs, operating expenses, and net profit or loss for the selected period.

Balance Sheet report must show assets, liabilities, and equity as of the selected date.

Cash Flow report must show opening cash, cash in, cash out, and closing cash.

Add filters by date range, client, project, payment status, and project status.

Allow export to PDF, Excel, and CSV.

Dashboard requirements:

Total projects, active projects, completed projects, pending payments, monthly income, monthly expenses, and monthly profit.

Cards for today’s shoots, upcoming events, overdue balances, and completed deliveries.

Charts for revenue trend, expense trend, and profit trend.

Database requirements:

Use a relational database structure.

Create linked tables for clients, projects, project_payments, project_expenses, project_tasks, staff, project_assignments, delivery_records, chart_of_accounts, journal_entries, journal_entry_lines, assets, liabilities, equity_transactions, income_transactions, expense_transactions.

Every payment, expense, task, and delivery record must link to the correct project.

Every journal entry must contain balanced debit and credit lines.

Business logic requirements:

Balance due = total agreed amount minus total payments received.

Project profit = total project income minus total project expenses.

Monthly profit = all income in period minus all expenses in period.

Assets, liabilities, and equity must be grouped correctly for the Balance Sheet.

P&L should calculate income and expenses for the selected period only.

Do not hardcode values; use database-driven calculations.

User roles:

Admin can manage everything.

Staff can only view assigned projects and update task/delivery status if permitted.

Additional features:

Search by client name, phone, project name, and venue.

Status badges and overdue alerts.

Printable receipts and invoices.

Activity log for all important actions.

Responsive layout for mobile and desktop.

Build the full app with forms, tables, CRUD actions, relations, dashboards, and reports in one complete system.



താഴെ കൊടുക്കുന്നത് copy-paste ready final Lovable prompt, Supabase SQL schema, and report logic എല്ലാം ഒരുമിച്ച് ആണ്. Zoho Books-ൽ Profit and Loss report reports section-ൽ നിന്നും, Balance Sheet business overview reports-ൽ നിന്നും ലഭിക്കുന്നതുപോലെ തന്നെ ഈ app-ിലും separate accounting reports ആയി build ചെയ്യണം.[zoho]

1) Final Lovable Prompt

ഇത് മുഴുവൻ copy ചെയ്ത് Lovable-ൽ paste ചെയ്യുക:

Build a full project-based accounting web app for JOG MEDIA, a wedding photography and videography business in Kozhikode, Kerala, India.
The app must manage every wedding as a project and also work as a proper accounting system.
Create a clean, mobile-friendly, professional UI in English with simple labels.

Core modules: Dashboard, Clients, Projects, Payments, Expenses, Tasks, Staff, Delivery, Accounts, Reports, Settings.

Project management requirements:

Store client name, phone, WhatsApp, email, address, event date, venue, package name, total agreed amount, advance amount, balance due, payment status, project status, shoot status, editing status, album status, delivery status, notes.

Allow multiple payments per project.

Allow multiple expenses per project.

Allow multiple tasks per project.

Assign multiple staff to a project.

Show project timeline and checklist.

Add quick actions for call, WhatsApp, add payment, add expense, and mark delivery complete.

Accounting requirements:

Include Chart of Accounts.

Include journal entries with debit and credit lines.

Track income, expenses, assets, liabilities, and equity.

Generate Profit & Loss report.

Generate Balance Sheet report.

Generate Cash Flow report.

Support date-range filters for all reports.

Support accrual and cash basis where possible.

Show project-wise profitability and monthly profitability.

Reports requirements:

Profit & Loss report must show income, direct costs, operating expenses, and net profit or loss for the selected period.

Balance Sheet report must show assets, liabilities, and equity as of the selected date.

Cash Flow report must show opening cash, cash in, cash out, and closing cash.

Add filters by date range, client, project, payment status, and project status.

Allow export to PDF, Excel, and CSV.

Dashboard requirements:

Total projects, active projects, completed projects, pending payments, monthly income, monthly expenses, and monthly profit.

Cards for today’s shoots, upcoming events, overdue balances, and completed deliveries.

Charts for revenue trend, expense trend, and profit trend.

Database requirements:

Use a relational database structure.

Create linked tables for clients, projects, project_payments, project_expenses, project_tasks, staff, project_assignments, delivery_records, chart_of_accounts, journal_entries, journal_entry_lines, assets, liabilities, equity_transactions, income_transactions, expense_transactions.

Every payment, expense, task, and delivery record must link to the correct project.

Every journal entry must contain balanced debit and credit lines.

Business logic requirements:

Balance due = total agreed amount minus total payments received.

Project profit = total project income minus total project expenses.

Monthly profit = all income in period minus all expenses in period.

Assets, liabilities, and equity must be grouped correctly for the Balance Sheet.

P&L should calculate income and expenses for the selected period only.

Do not hardcode values; use database-driven calculations.

User roles:

Admin can manage everything.

Staff can only view assigned projects and update task/delivery status if permitted.

Additional features:

Search by client name, phone, project name, and venue.

Status badges and overdue alerts.

Printable receipts and invoices.

Activity log for all important actions.

Responsive layout for mobile and desktop.

Build the full app with forms, tables, CRUD actions, relations, dashboards, and reports in one complete system.

Zoho Books reports documentation confirms that Profit and Loss is a standard report and Balance Sheet is part of business overview reports.[zoho]

2) Supabase SQL Schema

ഇത് Supabase SQL editor-ൽ paste ചെയ്യാം:

sql

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  whatsapp text,
  email text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  role text not null default 'staff',
  active_status boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  project_name text not null,
  event_date date not null,
  venue text,
  package_name text,
  total_amount numeric(14,2) not null default 0,
  advance_amount numeric(14,2) not null default 0,
  balance_due numeric(14,2) not null default 0,
  payment_status text not null default 'pending',
  project_status text not null default 'open',
  shoot_status text not null default 'pending',
  editing_status text not null default 'pending',
  album_status text not null default 'pending',
  delivery_status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  payment_date date not null default current_date,
  amount numeric(14,2) not null check (amount >= 0),
  payment_mode text not null,
  reference_no text,
  received_by uuid references staff(id),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists project_expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  expense_date date not null default current_date,
  category text not null,
  amount numeric(14,2) not null check (amount >= 0),
  paid_to text,
  payment_mode text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  task_name text not null,
  task_status text not null default 'pending',
  due_date date,
  assigned_to uuid references staff(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  staff_id uuid not null references staff(id) on delete cascade,
  role_in_project text,
  assigned_at timestamptz not null default now(),
  unique(project_id, staff_id)
);

create table if not exists delivery_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  delivery_type text not null,
  delivery_date date,
  file_link text,
  delivered_by uuid references staff(id),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  account_code text unique,
  account_name text not null,
  account_type text not null,
  parent_id uuid references chart_of_accounts(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  reference_no text,
  memo text,
  source_type text,
  source_id uuid,
  created_by uuid references staff(id),
  created_at timestamptz not null default now()
);

create table if not exists journal_entry_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references journal_entries(id) on delete cascade,
  account_id uuid not null references chart_of_accounts(id),
  description text,
  debit numeric(14,2) not null default 0 check (debit >= 0),
  credit numeric(14,2) not null default 0 check (credit >= 0),
  project_id uuid references projects(id),
  client_id uuid references clients(id),
  created_at timestamptz not null default now(),
  check (
    (debit > 0 and credit = 0) or
    (credit > 0 and debit = 0)
  )
);

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references chart_of_accounts(id),
  asset_name text not null,
  asset_value numeric(14,2) not null default 0,
  acquired_date date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists liabilities (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references chart_of_accounts(id),
  liability_name text not null,
  liability_value numeric(14,2) not null default 0,
  due_date date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists equity_transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references chart_of_accounts(id),
  transaction_date date not null default current_date,
  amount numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists income_transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references chart_of_accounts(id),
  project_id uuid references projects(id),
  transaction_date date not null default current_date,
  amount numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists expense_transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references chart_of_accounts(id),
  project_id uuid references projects(id),
  transaction_date date not null default current_date,
  amount numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

3) Report Logic

Project Profit

text

project profit = sum(project income) - sum(project expenses)

Balance Due

text

balance due = projects.total_amount - sum(project_payments.amount)

Monthly Income

text

monthly income = sum(income_transactions.amount)

Monthly Expenses

text

monthly expenses = sum(expense_transactions.amount)

Monthly Profit

text

monthly profit = monthly income - monthly expenses

Profit & Loss Report

Use selected date range and compute:

Income = all income transactions in range

Direct Costs = project expenses in range

Operating Expenses = non-project expense transactions in range

Net Profit = Income - Direct Costs - Operating Expenses

Zoho Books describes Profit and Loss as a report summarizing profits, losses, income, and operating/non-operating expenses for a specific period.[zoho]

Balance Sheet Report

As of selected date:

Assets = total asset account balances

Liabilities = total liability account balances

Equity = capital + retained earnings + equity transactions

Check:

text

Assets = Liabilities + Equity

Zoho Books explains that Balance Sheet summarizes assets, liabilities, and equity.[zoho]

Cash Flow Report

Use cash/bank linked accounts:

Opening cash

Cash in

Cash out

Closing cash = opening + cash in - cash out

Journal Entry Rule

For every journal entry:

text

total debit = total credit

4) Suggested Chart of Accounts Seed

Use these account types:

Assets.

Liabilities.

Equity.

Income.

Cost of Goods Sold.

Expenses.

Example accounts:

Cash.

Bank.

Accounts Receivable.

Accounts Payable.

Owner’s Capital.

Wedding Photography Income.

Editing Expense.

Travel Expense.

Album Cost.

Staff Payment Expense.

5) What this app will cover

This version covers:

project tracking.

cash and bank payment tracking.

expense tracking.

task management.

staff assignment.

P&L.

Balance Sheet.

Cash Flow.

journal-based accounting structure.

Zoho Books’ reporting section includes Profit and Loss and other business reports, which is the same accounting direction this schema is designed to support.[zoho]

Need one more thing from me: I can now give you the exact second prompt for Lovable to generate screens one by one, or the Supabase seed data for chart of accounts.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://jogweddiary.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bab999a3-399d-41c6-ada5-2f66324a15fe).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
