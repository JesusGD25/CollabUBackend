.PHONY: up down logs ps build install dev

# Docker
up:
	cd docker && docker compose up -d

down:
	cd docker && docker compose down

logs:
	cd docker && docker compose logs -f

ps:
	cd docker && docker compose ps

# Shared library
build-shared:
	cd shared && npm run build

# Install all
install:
	cd shared && npm install
	@for dir in services/*/; do \
		echo "Installing $$dir..."; \
		cd $$dir && npm install && cd ../..; \
	done

# Limpieza
clean:
	cd docker && docker compose down -v
	find . -name "node_modules" -type d -prune -exec rm -rf {} +
	find . -name "dist" -type d -prune -exec rm -rf {} +
