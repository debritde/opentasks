gnome-terminal -- bash -c "cd api/app && nodemon index.js; exec bash" \
                --tab -- bash -c "cd apiReverseproxy/app && nodemon index.js; exec bash" \
                --tab -- bash -c "cd mainApp/app && npm run dev; exec bash"
