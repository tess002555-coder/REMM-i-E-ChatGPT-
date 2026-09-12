# REMM(i) - C# WPF

Versi native Windows dari REMM(i), dibuat dengan C# dan WPF.

## Fitur

- Mascot 180x180 tanpa border dan transparan.
- Selalu berada di atas desktop.
- Drag bebas.
- Saat drag dilepas, mascot otomatis snap ke sisi layar terdekat.
- Mode peek: 75% mascot tetap terlihat dan 25% keluar layar.
- Klik mascot membuka Task Panel native terpisah berukuran 520x720.
- Tutup Task Panel untuk kembali ke mascot.
- Menggunakan `public/mascot.png` dari repository sebagai asset.

## Build lokal

Prasyarat: Windows 10/11 dan .NET 8 SDK.

```powershell
dotnet build .\REMM-i-WPF\REMM-i-WPF.csproj -c Release
dotnet run --project .\REMM-i-WPF\REMM-i-WPF.csproj
```

## Publish EXE

```powershell
dotnet publish .\REMM-i-WPF\REMM-i-WPF.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true
```

File hasil berada di folder `REMM-i-WPF\bin\Release\net8.0-windows\win-x64\publish\`.
