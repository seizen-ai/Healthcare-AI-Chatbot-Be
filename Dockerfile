# -----------------------------
# Base Image
# -----------------------------
FROM node:22-alpine

# -----------------------------
# Set Working Directory
# -----------------------------
WORKDIR /app

# -----------------------------
# Copy Dependency Files
# -----------------------------
COPY package*.json ./

# -----------------------------
# Install Dependencies
# -----------------------------
RUN npm install

# -----------------------------
# Copy Application Source Code
# -----------------------------
COPY . .

# -----------------------------
# Expose Backend Port
# -----------------------------
EXPOSE 5000

# -----------------------------
# Start the Server
# -----------------------------
CMD ["npm", "run", "dev"]