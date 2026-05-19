{ pkgs }: {
  deps = [
    pkgs.nodejs_22
    pkgs.chromium
    pkgs.espeak-ng
    pkgs.ffmpeg
  ];
}
