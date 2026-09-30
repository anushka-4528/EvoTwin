# EvoTwin

EvoTwin is an educational wellness app that helps people track daily well-being, remember their preferences, and get suggestions shaped around their goals and routines. It is a prototype, not a medical service.

## Features

- Create an account and get guided through setting up your profile
- Record sleep, activity, hydration, food choices, stress, and notes
- Ask the assistant questions and see which personal details shaped its answer
- Keep preferences for future suggestions and separate notes for today
- Review progress, try different daily values, and update your profile
- Download or delete your saved information
- Use built-in example suggestions without connecting another AI service

## Local development

1. Create the environment file:
   ```bash
   cp .env.example .env
   ```
2. Start MongoDB locally on port 27017.
3. Install backend requirements:
   ```bash
   cd backend && python3 -m pip install -r requirements.txt
   ```
4. Install frontend dependencies:
   ```bash
   cd frontend && npm install
   ```
5. Start backend:
   ```bash
   cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
6. Start frontend:
   ```bash
   cd frontend && npm run dev -- --host 0.0.0.0 --port 5173
   ```

## Docker

```bash
docker compose up --build
```

## Seed demo data

```bash
cd backend && python -m app.scripts.seed_demo
```

## Train ML model

```bash
cd backend && python -m app.scripts.train_model
```

## Run tests

```bash
cd backend && pytest -q
```

## Research evaluation

```bash
cd backend && python -m app.scripts.run_evaluation
```

## URLs

- Frontend: http://localhost:5173
- FastAPI docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

## Important limitations

- This is a research and educational wellness prototype.
- It does not replace professional medical evaluation.
- Use synthetic demo data only.
# EvoTwin
