(function () {
  'use strict';

  var canvas = document.getElementById('about-logo-canvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var reducedMotionMq = window.matchMedia('(prefers-reduced-motion: reduce)');

  var DISPLAY_W = 200;
  var DISPLAY_H = Math.round(DISPLAY_W * (69 / 170));
  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = DISPLAY_W * DPR;
  canvas.height = DISPLAY_H * DPR;
  canvas.style.width = DISPLAY_W + 'px';
  canvas.style.height = DISPLAY_H + 'px';
  ctx.scale(DPR, DPR);

  var img = new Image();
  img.src = 'data:image/svg+xml;base64,PHN2ZyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9ImRpc3BsYXk6IGJsb2NrOyIgd2lkdGg9IjE2OS4wOTQiIGhlaWdodD0iNjguMzQzOCIgdmlld0JveD0iMCAwIDE2OS4wOTQgNjguMzQzOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGcgaWQ9Ik1pQUkiPgo8cGF0aCBpZD0iVmVjdG9yIiBkPSJNMTU3LjE0MSA0LjU0Njg4QzE1Ny4xNDEgMy4yNjU2MiAxNTcuNzgxIDIuNjI1IDE1OS4wNjIgMi42MjVIMTY3LjE3MkMxNjguNDUzIDIuNjI1IDE2OS4wOTQgMy4yNjU2MiAxNjkuMDk0IDQuNTQ2ODhDMTY5LjA5NCA5LjcwMzEyIDE2OS4wNzggMTQuODU5NCAxNjkuMDQ3IDIwLjAxNTZDMTY5LjAxNiAyNS4xNzE5IDE2OSAzMC4zMjgxIDE2OSAzNS40ODQ0QzE2OSA0MC42NDA2IDE2OS4wMTYgNDUuNzk2OSAxNjkuMDQ3IDUwLjk1MzFDMTY5LjA3OCA1Ni4xMDk0IDE2OS4wOTQgNjEuMjY1NiAxNjkuMDk0IDY2LjQyMTlDMTY5LjA5NCA2Ny43MDMxIDE2OC40NTMgNjguMzQzOCAxNjcuMTcyIDY4LjM0MzhIMTU5LjA2MkMxNTcuNzgxIDY4LjM0MzggMTU3LjE0MSA2Ny43MDMxIDE1Ny4xNDEgNjYuNDIxOUMxNTcuMTQxIDYxLjI2NTYgMTU3LjE1NiA1Ni4xMDk0IDE1Ny4xODggNTAuOTUzMUMxNTcuMjE5IDQ1Ljc5NjkgMTU3LjIzNCA0MC42NDA2IDE1Ny4yMzQgMzUuNDg0NEMxNTcuMjM0IDMwLjMyODEgMTU3LjIxOSAyNS4xNzE5IDE1Ny4xODggMjAuMDE1NkMxNTcuMTU2IDE0Ljg1OTQgMTU3LjE0MSA5LjcwMzEyIDE1Ny4xNDEgNC41NDY4OFoiIGZpbGw9ImJsYWNrIi8+CjxwYXRoIGlkPSJWZWN0b3JfMiIgZD0iTTk1LjI5NjkgNjguMzQzOEM5NC44NTk0IDY4LjM0MzggOTQuMzkwNiA2OC4yODEyIDkzLjg5MDYgNjguMTU2MkM5My4zOTA2IDY4IDkzLjE0MDYgNjcuNjI1IDkzLjE0MDYgNjcuMDMxMkM5My4xNDA2IDY2Ljc4MTIgOTMuMTg3NSA2Ni41MzEyIDkzLjI4MTIgNjYuMjgxMkM5My4zNzUgNjYuMDMxMiA5My40Njg4IDY1Ljc5NjkgOTMuNTYyNSA2NS41NzgxQzk2LjMxMjUgNTkuNjQwNiA5OS4wMzEyIDUzLjcwMzEgMTAxLjcxOSA0Ny43NjU2QzEwNC40MzggNDEuODI4MSAxMDcuMTA5IDM1Ljg1OTQgMTA5LjczNCAyOS44NTk0QzExMS44OTEgMjQuOTIxOSAxMTQuMDMxIDE5Ljk4NDQgMTE2LjE1NiAxNS4wNDY5QzExOC4yODEgMTAuMDc4MSAxMjAuNDY5IDUuMTU2MjUgMTIyLjcxOSAwLjI4MTI1QzEyMi44MTIgMC4wOTM3NSAxMjIuOTY5IDAgMTIzLjE4OCAwQzEyMy40MDYgMCAxMjMuNTYyIDAuMDkzNzUgMTIzLjY1NiAwLjI4MTI1QzEyNS45MDYgNS4xNTYyNSAxMjguMDk0IDEwLjA3ODEgMTMwLjIxOSAxNS4wNDY5QzEzMi4zNDQgMTkuOTg0NCAxMzQuNDg0IDI0LjkyMTkgMTM2LjY0MSAyOS44NTk0QzEzOS4yNjYgMzUuODU5NCAxNDEuOTIyIDQxLjgyODEgMTQ0LjYwOSA0Ny43NjU2QzE0Ny4zMjggNTMuNzAzMSAxNTAuMDYyIDU5LjY0MDYgMTUyLjgxMiA2NS41NzgxQzE1Mi45MDYgNjUuNzk2OSAxNTMgNjYuMDMxMiAxNTMuMDk0IDY2LjI4MTJDMTUzLjE4OCA2Ni41MzEyIDE1My4yMzQgNjYuNzgxMiAxNTMuMjM0IDY3LjAzMTJDMTUzLjIzNCA2Ny42MjUgMTUyLjk4NCA2OCAxNTIuNDg0IDY4LjE1NjJDMTUxLjk4NCA2OC4yODEyIDE1MS41MTYgNjguMzQzOCAxNTEuMDc4IDY4LjM0MzhIMTQxLjYwOUMxNDAuODI4IDY4LjM0MzggMTQwLjIzNCA2Ny45NTMxIDEzOS44MjggNjcuMTcxOUMxMzkuNTc4IDY2LjY3MTkgMTM5LjM0NCA2Ni4xNDA2IDEzOS4xMjUgNjUuNTc4MUMxMzguOTA2IDY1LjAxNTYgMTM4LjY4OCA2NC40ODQ0IDEzOC40NjkgNjMuOTg0NEMxMzcuNzgxIDYyLjQyMTkgMTM3LjEwOSA2MC44MjgxIDEzNi40NTMgNTkuMjAzMUMxMzUuODI4IDU3LjU3ODEgMTM1LjE1NiA1NS45ODQ0IDEzNC40MzggNTQuNDIxOUMxMzQuMzQ0IDU0LjE3MTkgMTM0LjE3MiA1NC4wNDY5IDEzMy45MjIgNTQuMDQ2OUgxMTAuNzE5QzExMC40NjkgNTQuMDQ2OSAxMTAuMjk3IDU0LjE3MTkgMTEwLjIwMyA1NC40MjE5QzEwOS40NTMgNTUuOTg0NCAxMDguNzM0IDU3LjU3ODEgMTA4LjA0NyA1OS4yMDMxQzEwNy4zOTEgNjAuODI4MSAxMDYuNzAzIDYyLjQzNzUgMTA1Ljk4NCA2NC4wMzEyQzEwNS43NjYgNjQuNTMxMiAxMDUuNTMxIDY1LjA2MjUgMTA1LjI4MSA2NS42MjVDMTA1LjA2MiA2Ni4xODc1IDEwNC44MTIgNjYuNzE4OCAxMDQuNTMxIDY3LjIxODhDMTA0LjEyNSA2Ny45Njg4IDEwMy41NDcgNjguMzQzOCAxMDIuNzk3IDY4LjM0MzhIOTUuMjk2OVpNMTE0LjYwOSA0NC4yNUgxMzAuMjE5QzEyOC45NjkgNDEuMTI1IDEyNy43MDMgMzguMDE1NiAxMjYuNDIyIDM0LjkyMTlDMTI1LjE0MSAzMS43OTY5IDEyMy44NTkgMjguNjcxOSAxMjIuNTc4IDI1LjU0NjlDMTIxLjI2NiAyOC42NzE5IDExOS45MzggMzEuNzk2OSAxMTguNTk0IDM0LjkyMTlDMTE3LjI4MSAzOC4wMTU2IDExNS45NTMgNDEuMTI1IDExNC42MDkgNDQuMjVaIiBmaWxsPSJibGFjayIvPgo8cGF0aCBpZD0iVmVjdG9yXzMiIGQ9Ik03NS45NzcxIDkuODQzNzVDNzUuOTc3MSA4LjEyNSA3Ni42MTc3IDYuNjU2MjUgNzcuODk4OSA1LjQzNzVDNzkuMTgwMiA0LjE4NzUgODAuNjgwMiAzLjU2MjUgODIuMzk4OSAzLjU2MjVDODQuMTQ4OSAzLjU2MjUgODUuNjgwMiA0LjIwMzEyIDg2Ljk5MjcgNS40ODQzOEM4OC4zMzY0IDYuNzM0MzggODkuMDA4MyA4LjI1IDg5LjAwODMgMTAuMDMxMkM4OS4wMDgzIDExLjc1IDg4LjM2NzcgMTMuMjUgODcuMDg2NCAxNC41MzEyQzg1LjgzNjQgMTUuNzgxMiA4NC4zMzY0IDE2LjQwNjIgODIuNTg2NCAxNi40MDYyQzgwLjgwNTIgMTYuNDA2MiA3OS4yNTgzIDE1Ljc2NTYgNzcuOTQ1OCAxNC40ODQ0Qzc2LjYzMzMgMTMuMTcxOSA3NS45NzcxIDExLjYyNSA3NS45NzcxIDkuODQzNzVaTTc2LjY4MDIgMzguMTA5NFYyNy43NUM3Ni42ODAyIDI2LjQ2ODggNzcuMzIwOCAyNS44MjgxIDc4LjYwMjEgMjUuODI4MUg4NS44MjA4Qzg3LjEwMjEgMjUuODI4MSA4Ny43NDI3IDI2LjQ2ODggODcuNzQyNyAyNy43NUM4Ny43NDI3IDM0LjE4NzUgODcuNzU4MyA0MC42NDA2IDg3Ljc4OTYgNDcuMTA5NEM4Ny44MjA4IDUzLjU0NjkgODcuODM2NCA1OS45ODQ0IDg3LjgzNjQgNjYuNDIxOUM4Ny44MzY0IDY3LjcwMzEgODcuMTk1OCA2OC4zNDM4IDg1LjkxNDYgNjguMzQzOEg3OC41MDgzQzc3LjIyNzEgNjguMzQzOCA3Ni41ODY0IDY3LjcwMzEgNzYuNTg2NCA2Ni40MjE5Qzc2LjU4NjQgNjEuNzAzMSA3Ni42MDIxIDU2Ljk4NDQgNzYuNjMzMyA1Mi4yNjU2Qzc2LjY2NDYgNDcuNTQ2OSA3Ni42ODAyIDQyLjgyODEgNzYuNjgwMiAzOC4xMDk0WiIgZmlsbD0iYmxhY2siLz4KPHBhdGggaWQ9IlZlY3Rvcl80IiBkPSJNMS45MjE4OCA2OC4zNDM4QzAuNjQwNjI1IDY4LjM0MzggMCA2Ny42ODc1IDAgNjYuMzc1QzAgNjQuNjU2MiAwLjAzMTI1IDYyLjkzNzUgMC4wOTM3NSA2MS4yMTg4QzAuMTg3NSA1OS41IDAuMjUgNTcuNzgxMiAwLjI4MTI1IDU2LjA2MjVDMC4zNzUgNTIuNDM3NSAwLjQzNzUgNDguODI4MSAwLjQ2ODc1IDQ1LjIzNDRDMC41IDQxLjYwOTQgMC41MTU2MjUgMzggMC41MTU2MjUgMzQuNDA2MkMwLjUxNTYyNSAyOS44NDM4IDAuNDg0Mzc1IDI1LjI4MTIgMC40MjE4NzUgMjAuNzE4OEMwLjM1OTM3NSAxNi4xNTYyIDAuMjY1NjI1IDExLjYwOTQgMC4xNDA2MjUgNy4wNzgxMlY2LjYwOTM4QzAuMTQwNjI1IDYuMzU5MzggMC4xNzE4NzUgNS43OTY4OCAwLjIzNDM3NSA0LjkyMTg4QzAuMzI4MTI1IDQuMDQ2ODggMC42MjUgMy42MDkzOCAxLjEyNSAzLjYwOTM4QzEuNTYyNSAzLjYwOTM4IDIuMDMxMjUgMy45MjE4OCAyLjUzMTI1IDQuNTQ2ODhDMy4wMzEyNSA1LjE3MTg4IDMuMzkwNjIgNS42MjUgMy42MDkzOCA1LjkwNjI1QzguNDIxODggMTIuNDM3NSAxMy4wNjI1IDE5LjEyNSAxNy41MzEyIDI1Ljk2ODhDMjIgMzIuNzgxMiAyNi41NzgxIDM5LjUgMzEuMjY1NiA0Ni4xMjVDMzEuNDIxOSA0Ni4zNDM4IDMxLjU3ODEgNDYuNDUzMSAzMS43MzQ0IDQ2LjQ1MzFDMzEuODkwNiA0Ni40NTMxIDMyLjA0NjkgNDYuMzQzOCAzMi4yMDMxIDQ2LjEyNUMzNy4wMTU2IDM5LjQ2ODggNDEuNzAzMSAzMi43MTg4IDQ2LjI2NTYgMjUuODc1QzUwLjg1OTQgMTkuMDMxMiA1NS42MDk0IDEyLjMyODEgNjAuNTE1NiA1Ljc2NTYyQzYwLjczNDQgNS40ODQzOCA2MS4wOTM4IDUuMDQ2ODggNjEuNTkzOCA0LjQ1MzEyQzYyLjEyNSAzLjgyODEyIDYyLjU5MzggMy41MTU2MiA2MyAzLjUxNTYyQzYzLjUzMTIgMy41MTU2MiA2My44MjgxIDMuOTUzMTIgNjMuODkwNiA0LjgyODEyQzYzLjk1MzEgNS43MDMxMiA2My45ODQ0IDYuMjY1NjIgNjMuOTg0NCA2LjUxNTYyVjYuOTg0MzhDNjMuODU5NCAxMS41NDY5IDYzLjc2NTYgMTYuMTI1IDYzLjcwMzEgMjAuNzE4OEM2My42NDA2IDI1LjI4MTIgNjMuNjA5NCAyOS44NDM4IDYzLjYwOTQgMzQuNDA2MkM2My42MDk0IDM4IDYzLjYyNSA0MS42MDk0IDYzLjY1NjIgNDUuMjM0NEM2My42ODc1IDQ4LjgyODEgNjMuNzUgNTIuNDM3NSA2My44NDM4IDU2LjA2MjVDNjMuOTA2MiA1Ny43ODEyIDYzLjk2ODggNTkuNSA2NC4wMzEyIDYxLjIxODhDNjQuMDkzOCA2Mi45Mzc1IDY0LjEyNSA2NC42NTYyIDY0LjEyNSA2Ni4zNzVDNjQuMTI1IDY3LjY4NzUgNjMuNDg0NCA2OC4zNDM4IDYyLjIwMzEgNjguMzQzOEg1NC4xNDA2QzUzLjQ1MzEgNjguMzQzOCA1Mi45Njg4IDY4LjE4NzUgNTIuNjg3NSA2Ny44NzVDNTIuNDM3NSA2Ny41NjI1IDUyLjI4MTIgNjcuMDkzOCA1Mi4yMTg4IDY2LjQ2ODhDNTIuMTg3NSA2Ni4wMzEyIDUyLjE3MTkgNjUuNTYyNSA1Mi4xNzE5IDY1LjA2MjVDNTIuMTcxOSA2NC41MzEyIDUyLjE3MTkgNjQuMDMxMiA1Mi4xNzE5IDYzLjU2MjVMNTIuMDc4MSA1Ni43NjU2QzUyLjAxNTYgNTMuMzU5NCA1MS45Njg4IDQ5Ljk1MzEgNTEuOTM3NSA0Ni41NDY5QzUxLjkwNjIgNDMuMTQwNiA1MS44OTA2IDM5LjczNDQgNTEuODkwNiAzNi4zMjgxQzUxLjg5MDYgMzYuMjY1NiA1MS44NzUgMzYuMDc4MSA1MS44NDM4IDM1Ljc2NTZDNTEuODQzOCAzNS40MjE5IDUxLjc2NTYgMzUuMjUgNTEuNjA5NCAzNS4yNUM1MS40ODQ0IDM1LjI1IDUxLjM0MzggMzUuMzc1IDUxLjE4NzUgMzUuNjI1QzUxLjAzMTIgMzUuODQzOCA1MC45MjE5IDM1Ljk4NDQgNTAuODU5NCAzNi4wNDY5QzQ4LjgyODEgMzkuMTcxOSA0Ni44MTI1IDQyLjMyODEgNDQuODEyNSA0NS41MTU2QzQyLjg0MzggNDguNjcxOSA0MC44NDM4IDUxLjgyODEgMzguODEyNSA1NC45ODQ0QzM4IDU2LjI2NTYgMzcuMTg3NSA1Ny41NjI1IDM2LjM3NSA1OC44NzVDMzUuNTYyNSA2MC4xODc1IDM0LjcxODggNjEuNDY4OCAzMy44NDM4IDYyLjcxODhDMzMuNjU2MiA2Mi45Njg4IDMzLjQzNzUgNjMuMjUgMzMuMTg3NSA2My41NjI1QzMyLjkzNzUgNjMuODQzOCAzMi42MjUgNjMuOTg0NCAzMi4yNSA2My45ODQ0QzMxLjkwNjIgNjMuOTg0NCAzMS41OTM4IDYzLjg1OTQgMzEuMzEyNSA2My42MDk0QzMxLjA2MjUgNjMuMzI4MSAzMC44NDM4IDYzLjA2MjUgMzAuNjU2MiA2Mi44MTI1QzI5Ljg3NSA2MS43MTg4IDI5LjA5MzggNjAuNjA5NCAyOC4zMTI1IDU5LjQ4NDRDMjcuNTYyNSA1OC4zNTk0IDI2LjgxMjUgNTcuMjM0NCAyNi4wNjI1IDU2LjEwOTRDMjMuODc1IDUyLjkyMTkgMjEuNjg3NSA0OS43MTg4IDE5LjUgNDYuNUMxNy4zNDM4IDQzLjI1IDE1LjE0MDYgNDAuMDQ2OSAxMi44OTA2IDM2Ljg5MDZDMTIuODU5NCAzNi44MjgxIDEyLjc2NTYgMzYuNzAzMSAxMi42MDk0IDM2LjUxNTZDMTIuNDUzMSAzNi4yOTY5IDEyLjMxMjUgMzYuMTg3NSAxMi4xODc1IDM2LjE4NzVDMTIuMDMxMiAzNi4xODc1IDExLjkzNzUgMzYuMzQzOCAxMS45MDYyIDM2LjY1NjJDMTEuODc1IDM2Ljk2ODggMTEuODU5NCAzNy4xNTYyIDExLjg1OTQgMzcuMjE4OEMxMS44NTk0IDQwLjUzMTIgMTEuODQzOCA0My44NDM4IDExLjgxMjUgNDcuMTU2MkMxMS43ODEyIDUwLjQzNzUgMTEuNzM0NCA1My43MzQ0IDExLjY3MTkgNTcuMDQ2OUwxMS41NzgxIDYzLjY1NjJDMTEuNTc4MSA2NC4wOTM4IDExLjU3ODEgNjQuNTYyNSAxMS41NzgxIDY1LjA2MjVDMTEuNjA5NCA2NS41NjI1IDExLjU5MzggNjYuMDMxMiAxMS41MzEyIDY2LjQ2ODhDMTEuNDY4OCA2Ny4wOTM4IDExLjMxMjUgNjcuNTYyNSAxMS4wNjI1IDY3Ljg3NUMxMC44MTI1IDY4LjE4NzUgMTAuMzI4MSA2OC4zNDM4IDkuNjA5MzggNjguMzQzOEgxLjkyMTg4WiIgZmlsbD0iYmxhY2siLz4KPC9nPgo8L3N2Zz4K';

  var DURATION = 3000;
  var PHASE_A_END = 1300; // approach
  var PHASE_B_END = 1550; // meet / sizing each other up
  var PHASE_C_END = 2500; // resolve into logo shape
  var FADE_IN = 250;

  var dots = [];
  var rafId = null;
  var startTime = null;
  var hasPlayed = false;

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function buildDots() {
    var sample = document.createElement('canvas');
    sample.width = DISPLAY_W;
    sample.height = DISPLAY_H;
    var sctx = sample.getContext('2d');
    sctx.clearRect(0, 0, DISPLAY_W, DISPLAY_H);
    sctx.drawImage(img, 0, 0, DISPLAY_W, DISPLAY_H);
    var data = sctx.getImageData(0, 0, DISPLAY_W, DISPLAY_H).data;

    var spacing = 3;
    var centerX = DISPLAY_W / 2;
    var centerY = DISPLAY_H / 2;
    var list = [];

    for (var y = spacing / 2; y < DISPLAY_H; y += spacing) {
      for (var x = spacing / 2; x < DISPLAY_W; x += spacing) {
        var px = Math.min(DISPLAY_W - 1, Math.floor(x));
        var py = Math.min(DISPLAY_H - 1, Math.floor(y));
        var alpha = data[(py * DISPLAY_W + px) * 4 + 3];
        if (alpha < 140) continue;

        var side = x < centerX ? -1 : 1;
        var edgeMargin = 70 + Math.random() * 90;
        var startX = side < 0 ? -edgeMargin : DISPLAY_W + edgeMargin;
        var startY = y + (Math.random() - 0.5) * 160;

        var mingleRadius = 26 + Math.random() * 46;
        var mingleAngle = Math.random() * Math.PI * 2;
        var mingleX = centerX + Math.cos(mingleAngle) * mingleRadius * (DISPLAY_W / DISPLAY_H) * 0.5;
        var mingleY = centerY + Math.sin(mingleAngle) * mingleRadius;

        list.push({
          startX: startX,
          startY: startY,
          mingleX: mingleX,
          mingleY: mingleY,
          targetX: x,
          targetY: y,
          jitterAngle: Math.random() * Math.PI * 2,
          jitterAmp: 5 + Math.random() * 9,
          jitterFreq: 1.4 + Math.random() * 1.4,
          stagger: Math.random(),
          radius: 1.15 + Math.random() * 0.55,
          approachCurve: (Math.random() - 0.5) * 70
        });
      }
    }
    dots = list;
  }

  function drawFrame(elapsed) {
    ctx.clearRect(0, 0, DISPLAY_W, DISPLAY_H);

    var showLogo = false, logoOpacity = 0, glowT = 0;

    if (elapsed >= PHASE_C_END) {
      var dT = clamp01((elapsed - PHASE_C_END) / (DURATION - PHASE_C_END));
      showLogo = true;
      logoOpacity = easeOutCubic(dT);
      glowT = dT;
    }

    ctx.save();
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      var x, y, opacity;

      if (elapsed <= PHASE_A_END) {
        var t = clamp01(elapsed / PHASE_A_END);
        var e = easeOutCubic(t);
        var midX = (d.startX + d.mingleX) / 2 + d.approachCurve;
        x = lerp(lerp(d.startX, midX, e), lerp(midX, d.mingleX, e), e);
        y = lerp(d.startY, d.mingleY, e);
        opacity = clamp01(elapsed / FADE_IN);
      } else if (elapsed <= PHASE_B_END) {
        var t2 = (elapsed - PHASE_A_END) / (PHASE_B_END - PHASE_A_END);
        var decay = 1 - t2;
        var jitter = Math.sin(t2 * Math.PI * 2 * d.jitterFreq) * decay * d.jitterAmp;
        x = d.mingleX + Math.cos(d.jitterAngle) * jitter;
        y = d.mingleY + Math.sin(d.jitterAngle) * jitter;
        opacity = 1;
      } else if (elapsed <= PHASE_C_END) {
        var dotStart = PHASE_B_END + d.stagger * 150;
        var dotDur = Math.max(1, PHASE_C_END - dotStart);
        var t3 = clamp01((elapsed - dotStart) / dotDur);
        var e3 = easeInOutCubic(t3);
        x = lerp(d.mingleX, d.targetX, e3);
        y = lerp(d.mingleY, d.targetY, e3);
        opacity = 1;
      } else {
        var t4 = clamp01((elapsed - PHASE_C_END) / (DURATION - PHASE_C_END));
        x = d.targetX;
        y = d.targetY;
        opacity = lerp(1, 0.22, t4);
      }

      ctx.globalAlpha = opacity;
      ctx.fillStyle = '#040404';
      ctx.beginPath();
      ctx.arc(x, y, d.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (glowT > 0) {
      ctx.save();
      var glowScale = lerp(0.7, 1.5, glowT);
      var glowOpacity = (1 - glowT) * 0.55;
      var gx = DISPLAY_W / 2, gy = DISPLAY_H / 2;
      var gr = Math.max(DISPLAY_W, DISPLAY_H) * 0.55 * glowScale;
      var grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      grad.addColorStop(0, 'rgba(237, 83, 3, ' + glowOpacity + ')');
      grad.addColorStop(1, 'rgba(237, 83, 3, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, DISPLAY_W, DISPLAY_H);
      ctx.restore();
    }

    if (showLogo) {
      ctx.save();
      ctx.globalAlpha = logoOpacity;
      ctx.drawImage(img, 0, 0, DISPLAY_W, DISPLAY_H);
      ctx.restore();
    }
  }

  function drawFinalStateOnly() {
    ctx.clearRect(0, 0, DISPLAY_W, DISPLAY_H);
    ctx.drawImage(img, 0, 0, DISPLAY_W, DISPLAY_H);
  }

  function tick(now) {
    if (startTime === null) startTime = now;
    var elapsed = now - startTime;
    drawFrame(Math.min(elapsed, DURATION));
    if (elapsed < DURATION) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
    }
  }

  function play() {
    if (rafId) cancelAnimationFrame(rafId);
    startTime = null;
    rafId = requestAnimationFrame(tick);
  }

  function startWhenVisible() {
    if (!('IntersectionObserver' in window)) {
      play();
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !hasPlayed) {
          hasPlayed = true;
          play();
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    io.observe(canvas);
  }

  img.onload = function () {
    buildDots();
    if (reducedMotionMq.matches) {
      drawFinalStateOnly();
    } else {
      startWhenVisible();
    }
  };
})();
