# Deploy — GCP Free Tier (e2-micro)

Guia para deploy do **messaging-officer** e **kaizen-secretary** em uma VM gratuita do Google Cloud Platform.

> **Recursos da VM (Always Free):** 0,25 vCPU (burstável), 1 GB RAM, 30 GB disco — regiões `us-central1`, `us-west1` ou `us-east1`.

---

## 1. Criar a VM no Google Cloud

1. Acesse [console.cloud.google.com](https://console.cloud.google.com) e crie uma conta (o cartão de crédito é exigido mas não será cobrado para recursos Always Free).
2. Crie um novo projeto (ex: `manda-pra-mim`).
3. Vá em **Compute Engine > Instâncias de VM > Criar instância** com as configurações:

| Campo | Valor |
|---|---|
| Nome | `manda-pra-mim` |
| Região | `us-central1` (Iowa) |
| Tipo de máquina | `e2-micro` |
| Imagem de boot | Ubuntu 22.04 LTS Minimal |
| Disco | 30 GB Standard Persistent Disk |
| Firewall | Permitir tráfego HTTP e HTTPS |

4. Clique em **Criar**.

---

## 2. Acessar a VM

Pelo console do GCP, clique em **SSH** ao lado da VM. Ou, pelo terminal local:

```bash
gcloud compute ssh manda-pra-mim --zone=us-central1-a
```

---

## 3. Instalar o runtime de containers

Existem duas opções: **Docker** ou **Podman**. Ambos rodam os mesmos Dockerfiles e imagens. A diferença é que o Podman **não possui daemon**, economizando ~150 MB de RAM — significativo em uma VM com 1 GB.

### Opção A: Podman (recomendado para e2-micro)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y podman podman-compose
```

Verifique a instalação:

```bash
podman --version
podman-compose --version
```

### Opção B: Docker

```bash
sudo apt update && sudo apt upgrade -y

sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

sudo usermod -aG docker $USER
newgrp docker
```

Verifique a instalação:

```bash
docker --version
docker compose version
```

### Comparação

| Aspecto | Docker | Podman |
|---|---|---|
| RAM do daemon | ~150 MB (sempre rodando) | 0 MB (sem daemon) |
| Comandos | `docker compose` | `podman-compose` |
| Dockerfiles | Compatível | Compatível |
| docker-compose.yml | Compatível | Compatível |
| Requer root | Sim (daemon roda como root) | Não (rootless por padrão) |

> Nos passos seguintes, os comandos serão exibidos com `docker`. Se escolheu Podman, substitua `docker` por `podman` e `docker compose` por `podman-compose`.

---

## 4. Configurar swap

Com 1 GB de RAM, o swap é essencial para evitar que o sistema mate processos por falta de memória.

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Verifique:

```bash
free -h
```

---

## 5. Configurar chave SSH do GitHub

Para clonar repositórios privados:

```bash
ssh-keygen -t ed25519 -C "seu-email@exemplo.com"
cat ~/.ssh/id_ed25519.pub
```

Copie a chave pública exibida e adicione no GitHub em **Settings > SSH and GPG keys > New SSH key**.

Teste a conexão:

```bash
ssh -T git@github.com
```

---

## 6. Clonar os repositórios

```bash
mkdir ~/apps && cd ~/apps
git clone git@github.com:ropehapi/messaging-officer.git
git clone git@github.com:ropehapi/kaizen-secretary.git
```

---

## 7. Configurar variáveis de ambiente

### messaging-officer

```bash
cd ~/apps/messaging-officer
cp .env.example .env
nano .env
```

### kaizen-secretary

```bash
cd ~/apps/kaizen-secretary
cp .env.example .env
nano .env
```

No `.env` do kaizen-secretary, aponte para o nome do container na rede compartilhada:

```env
MESSAGING_OFFICER_HOST=http://messaging-officer
MESSAGING_OFFICER_PORT=3000
```

---

## 8. Subir os serviços

### Criar a rede compartilhada

Ambos os serviços usam a rede externa `manda-pra-mim` para se comunicarem pelo nome do container. Crie-a uma única vez:

**Docker:**

```bash
docker network create manda-pra-mim
```

**Podman:**

```bash
podman network create manda-pra-mim
```

### Subir o messaging-officer (primeiro)

**Docker:**

```bash
cd ~/apps/messaging-officer
docker compose up -d --build
```

**Podman:**

```bash
cd ~/apps/messaging-officer
podman-compose up -d --build
```

### Subir o kaizen-secretary

**Docker:**

```bash
cd ~/apps/kaizen-secretary
docker compose up -d --build
```

**Podman:**

```bash
cd ~/apps/kaizen-secretary
podman-compose up -d --build
```

### Verificar

**Docker:**

```bash
docker ps
```

**Podman:**

```bash
podman ps
```

Os dois containers devem aparecer com status `Up`.

---

## 9. Liberar porta no firewall da GCP

Para acessar a API e o Swagger externamente, libere a porta `3000`:

1. No console da GCP, vá em **VPC Network > Firewall > Criar regra de firewall**

| Campo | Valor |
|---|---|
| Nome | `allow-3000` |
| Direção | Entrada (Ingress) |
| Destinos | Todas as instâncias da rede |
| Filtro de origem | `0.0.0.0/0` |
| Protocolo/Porta | TCP: `3000` |

2. Após criar, acesse no navegador:

```
http://<IP-EXTERNO-DA-VM>:3000/docs
```

O IP externo da VM é exibido no painel do Compute Engine.

---

## 10. Conectar sessão do WhatsApp

Com a API acessível, crie uma sessão e escaneie o QR code:

1. Crie a sessão:

```bash
curl -X POST http://<IP-EXTERNO>:3000/api/sessions \
  -H "Content-Type: application/json" \
  -H "x-api-key: <SUA_API_KEY>" \
  -d '{ "sessionId": "pedro" }'
```

2. Abra no navegador: `http://<IP-EXTERNO>:3000/api/sessions/pedro/qr`
3. Escaneie o QR code com o WhatsApp (Menu → Dispositivos conectados → Conectar dispositivo)

> Para mais detalhes sobre uso da API, consulte o [USAGE.md](USAGE.md).

---

## Comandos úteis

> Substitua `docker` por `podman` e `docker compose` por `podman-compose` se estiver usando Podman.

### Monitoramento

```bash
# Containers rodando
docker ps

# Logs em tempo real
docker logs -f messaging-officer
docker logs -f kaizen-secretary

# Uso de memória do sistema
free -h

# Uso de memória dos containers
docker stats --no-stream
```

### Parar os serviços

```bash
cd ~/apps/messaging-officer && docker compose down
cd ~/apps/kaizen-secretary && docker compose down
```

### Reiniciar os serviços

```bash
cd ~/apps/messaging-officer && docker compose up -d
cd ~/apps/kaizen-secretary && docker compose up -d
```

### Atualizar após um git push

```bash
cd ~/apps/messaging-officer
git pull
docker compose up -d --build

cd ~/apps/kaizen-secretary
git pull
docker compose up -d --build
```

---

## Estimativa de uso de memória

### Com Docker

| Componente | RAM estimada |
|---|---|
| SO (Ubuntu Minimal) | ~120 MB |
| Docker daemon (dockerd + containerd) | ~150 MB |
| messaging-officer (Node.js, heap limitado a 200 MB) | ~200-250 MB |
| kaizen-secretary (binário Go) | ~10-15 MB |
| **Total** | **~480-535 MB** |

### Com Podman

| Componente | RAM estimada |
|---|---|
| SO (Ubuntu Minimal) | ~120 MB |
| Podman (sem daemon) | ~0 MB |
| messaging-officer (Node.js, heap limitado a 200 MB) | ~200-250 MB |
| kaizen-secretary (binário Go) | ~10-15 MB |
| **Total** | **~330-385 MB** |

Com o swap de 2 GB configurado, há margem confortável para picos de uso em ambos os cenários.
