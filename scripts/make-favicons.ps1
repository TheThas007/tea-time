Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Thasmilan\.gemini\antigravity\brain\7129b81b-5f52-4f02-8528-756e55762608\.user_uploaded\media_1793299133944_7e567a88.png"
$publicDir = "d:\Tea time\public"
$assetsDir = "d:\Tea time\public\assets"

if (-not (Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null
}

$srcImage = [System.Drawing.Image]::FromFile($srcPath)
Write-Host "Source image dimensions: $($srcImage.Width) x $($srcImage.Height)"

# Copy high-res master icon to public/assets/menyo-icon.png
Copy-Item -Path $srcPath -Destination "$assetsDir\menyo-icon.png" -Force

function Resize-ImagePng([System.Drawing.Image]$img, [int]$size, [string]$outPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($img, 0, 0, $size, $size)
    $g.Dispose()
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Saved: $outPath ($size x $size)"
}

Resize-ImagePng $srcImage 16 "$publicDir\favicon-16x16.png"
Resize-ImagePng $srcImage 32 "$publicDir\favicon-32x32.png"
Resize-ImagePng $srcImage 48 "$publicDir\favicon-48x48.png"
Resize-ImagePng $srcImage 180 "$publicDir\apple-touch-icon.png"
Resize-ImagePng $srcImage 192 "$publicDir\icon-192.png"
Resize-ImagePng $srcImage 512 "$publicDir\icon-512.png"
Resize-ImagePng $srcImage 512 "$publicDir\favicon.png"

$srcImage.Dispose()
Write-Host "All PNG icons resized successfully!"

