using System;
using System.Drawing;
using System.IO;
using System.Threading.Tasks;
using System.Windows;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;

namespace RemmI;

internal static class WebViewHostService
{
    private const string HostName = "app.local";
    private static readonly Lazy<Task<CoreWebView2Environment>> EnvironmentTask = new(CreateEnvironmentAsync);

    public static async Task InitializeAsync(
        WebView2 browser,
        string windowMode,
        EventHandler<CoreWebView2WebMessageReceivedEventArgs> onMessage)
    {
        var webUiFolder = Path.Combine(AppContext.BaseDirectory, "WebUI");
        var pagePath = Path.Combine(webUiFolder, "index.html");
        if (!File.Exists(pagePath))
            throw new FileNotFoundException($"Web UI tidak ditemukan: {pagePath}", pagePath);

        browser.DefaultBackgroundColor = windowMode == "mascot"
            ? Color.FromArgb(0, 0, 0, 0)
            : Color.FromArgb(255, 19, 26, 33);
        await browser.EnsureCoreWebView2Async(await EnvironmentTask.Value);

        var core = browser.CoreWebView2;
        core.SetVirtualHostNameToFolderMapping(HostName, webUiFolder, CoreWebView2HostResourceAccessKind.DenyCors);
        var poseFolder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "REMM-i",
            "poses");
        Directory.CreateDirectory(poseFolder);
        core.SetVirtualHostNameToFolderMapping("pose.local", poseFolder, CoreWebView2HostResourceAccessKind.DenyCors);
        core.Settings.AreDevToolsEnabled = false;
        core.Settings.AreDefaultContextMenusEnabled = false;
        core.Settings.IsStatusBarEnabled = false;
        core.Settings.IsZoomControlEnabled = false;
        core.WebMessageReceived += onMessage;
        core.NavigationStarting += (_, args) =>
        {
            if (!Uri.TryCreate(args.Uri, UriKind.Absolute, out var uri)
                || !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
                || !string.Equals(uri.Host, HostName, StringComparison.OrdinalIgnoreCase))
            {
                args.Cancel = true;
            }
        };
        core.ProcessFailed += (_, args) =>
        {
            if (args.ProcessFailedKind == CoreWebView2ProcessFailedKind.BrowserProcessExited)
            {
                Application.Current.Dispatcher.BeginInvoke(() => MessageBox.Show(
                    "Komponen WebView2 berhenti. Tutup lalu buka kembali REMM(i)E.",
                    "REMM(i)E",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error));
            }
        };

        browser.Source = new Uri($"https://{HostName}/index.html?window={Uri.EscapeDataString(windowMode)}");
    }

    public static bool IsTrustedSource(string source)
    {
        return Uri.TryCreate(source, UriKind.Absolute, out var uri)
            && string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
            && string.Equals(uri.Host, HostName, StringComparison.OrdinalIgnoreCase)
            && uri.AbsolutePath.EndsWith("/index.html", StringComparison.OrdinalIgnoreCase);
    }

    private static Task<CoreWebView2Environment> CreateEnvironmentAsync()
    {
        var userDataFolder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "REMM-i",
            "WebView2");
        Directory.CreateDirectory(userDataFolder);
        return CoreWebView2Environment.CreateAsync(userDataFolder: userDataFolder);
    }
}
