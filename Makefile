OFFICER_DIR = ~/apps/kaizen-messaging-officer
SECRETARY_DIR = ~/apps/kaizen-secretary

.PHONY: up down restart update logs stats ps

up:
	cd $(OFFICER_DIR) && docker compose up -d
	cd $(SECRETARY_DIR) && docker compose up -d

down:
	cd $(SECRETARY_DIR) && docker compose down
	cd $(OFFICER_DIR) && docker compose down

restart: down up

update:
	cd $(OFFICER_DIR) && git pull && docker compose up -d --build
	cd $(SECRETARY_DIR) && git pull && docker compose up -d --build
	docker image prune -f

logs-officer:
	cd $(OFFICER_DIR) && docker compose logs -f

logs-secretary:
	cd $(SECRETARY_DIR) && docker compose logs -f

stats:
	docker stats --no-stream

ps:
	docker ps

network:
	docker network create manda-pra-mim 2>/dev/null || true