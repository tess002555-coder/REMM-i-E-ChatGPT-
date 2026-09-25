using System;
using System.Windows;
using System.Windows.Threading;

namespace RemmI;

public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        DispatcherUnhandledException += OnDispatcherUnhandledException;

        try
        {
            var main = new MainWindow();
            MainWindow = main;
            main.Show();
            main.Activate();
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                "REMM(i)E gagal dijalankan.\n\n" + ex.Message,
                "REMM(i)E - Startup Error",
                MessageBoxButton.OK,
                MessageBoxImage.Error);
            Shutdown(1);
        }
    }

    private void OnDispatcherUnhandledException(object sender, DispatcherUnhandledExceptionEventArgs e)
    {
        MessageBox.Show(
            "REMM(i)E mengalami error:\n\n" + e.Exception.Message,
            "REMM(i)E - Error",
            MessageBoxButton.OK,
            MessageBoxImage.Error);

        e.Handled = true;
    }
}