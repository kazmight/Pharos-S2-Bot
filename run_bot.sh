#!/bin/bash

cd /workspace/Pharos-S2-Bot

if [ ! -d "node_modules" ]; then
  echo "Direktori node_modules tidak ditemukan. Melakukan npm install..."
  npm install
  if [ $? -ne 0 ]; then
    echo "npm install gagal. Harap periksa koneksi internet atau masalah dependensi."
    exit 1
  fi
  echo "npm install selesai."
else
  echo "Direktori node_modules sudah ada. Melewatkan npm install."
fi


echo "Menjalankan skrip kazmight.js..."
node kazmight.js
