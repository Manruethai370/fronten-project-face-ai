# Backend setup

1. Import the provided SQL dump into MariaDB/MySQL as `project_face_ai_db`.
2. Apply `backend/migrations/001_student_workflows.sql` to add Student profile fields, preferences, announcement reads, weekly schedule, face-image pose storage, and announcement categories.
3. From this directory, install dependencies with `pip install -r requirements.txt`.
4. Copy `.env.example` to `.env`, then set the database host, port, user, password, and a long random `SESSION_SECRET`.
5. Start the API with `uvicorn main:app --reload --port 8000`.
6. Start the frontend with `npm run dev` from the repository root; Vite proxies `/api` to the local API.
7. Open `http://127.0.0.1:8000/api/health/database` to see whether the API can connect to MariaDB. A successful response reports `status: connected` and the number of tables.

Keep `.env` private. Student check-ins use the database's explicitly enabled manual fallback and enforce enrollment, session window, and duplicate checks. Face-image uploads are stored pending teacher approval; automatic face matching is not enabled because this project has no compatible face-recognition model implementation.