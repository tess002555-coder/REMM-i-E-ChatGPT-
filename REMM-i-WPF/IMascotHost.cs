using System.Windows;
using RemmI.Models;

namespace RemmI;

public interface IMascotHost
{
    double Left { get; }
    double Top { get; }
    double Width { get; }

    Rect GetWorkingAreaInDip();
    void ApplySettings(RemmSettings settings);
    void RefreshPose();
}
