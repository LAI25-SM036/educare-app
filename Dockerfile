# ---- Instalasi Node.js ----
FROM node:20.18.0-bullseye-slim

# Atur direktori kerja di dalam kontainer
WORKDIR /app

# ---- Instalasi Dependensi Sistem (jika diperlukan) ----
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        python3-pip \
        git \
        libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

# Tambahkan symlink python3 ke python
RUN ln -s /usr/bin/python3 /usr/bin/python

# ---- Instalasi Dependensi Python ----
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# ---- Instalasi Dependensi Node.js ----
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# ---- Salin Seluruh Kode Aplikasi ----
COPY . .

# ---- Konfigurasi Environment ----
ENV NODE_ENV production
ENV PORT 5000
ENV SESSION_SECRET=cb1302c63faeb79b754e34cd355ad87e025f4fd3e86bdd98589a320192b0cfec

# ---- Perintah Start Aplikasi ----
CMD ["npm", "start"]