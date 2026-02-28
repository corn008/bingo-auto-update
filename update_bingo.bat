@echo off
echo 正在爬取最新 Bingo Bingo 資料...
python bingo_history_scraper.py
echo.
echo 正在打包網頁檔案...
python build_dist.py
echo.
echo 正在上傳至 Cloudflare Pages...
npx wrangler pages deploy dist --project-name bingo-taiwan
echo.
echo ✅ 全部更新完成！您的網站已是最新的狀態。
pause
