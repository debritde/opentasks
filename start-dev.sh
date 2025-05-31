gnome-terminal -- bash -c "cd api/app && nodemon index.js; exec bash" \
                --tab -- bash -c "cd mainApp/app && npm run dev; exec bash" \
                --tab -- bash -c "docker compose -f docker-compose.dev.yaml up -d mongodb; exec bash"
