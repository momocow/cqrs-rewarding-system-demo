release: sh -c 'if [ "$STORAGE_DRIVER" = "memory" ]; then echo "STORAGE_DRIVER=memory: skipping DB migrations"; else npx sequelize-cli db:migrate; fi'
web: node dist/main
