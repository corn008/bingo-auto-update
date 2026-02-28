import os
import shutil
import glob

# 目標發布資料夾
dist_dir = "dist"
if os.path.exists(dist_dir):
    shutil.rmtree(dist_dir)
os.makedirs(dist_dir)

# 需要複製的檔案
files_to_copy = ["index.html", "style.css", "app.js"]

for f in files_to_copy:
    if os.path.exists(f):
        shutil.copy(f, os.path.join(dist_dir, f))

# 複製所有的 bingo json 檔案
json_files = glob.glob("bingo_history_*.json")
for jf in json_files:
    shutil.copy(jf, os.path.join(dist_dir, jf))

print(f"✅ 已成功將網頁檔案與資料打包至 '{dist_dir}' 資料夾。")
