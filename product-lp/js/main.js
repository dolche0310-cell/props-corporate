/* ===== MiAI Landing – Vanilla JS ===== */

(function () {
  "use strict";

  /* ---------- Micromodal ---------- */
  function initMicromodal() {
    if (typeof MicroModal === "undefined") return;
    MicroModal.init({
      disableScroll: true,
      awaitOpenAnimation: true,
      awaitCloseAnimation: true,
      disableFocus: true,
    });
  }

  /* ---------- Logos Carousel (Splide loop + auto scroll) ---------- */
  function initLogosCarousel() {
    if (!document.getElementById("lp_logos")) return;
    if (typeof Splide === "undefined") {
      // ライブラリ未到着なら load 後にもう一度だけ試す
      window.addEventListener("load", function () {
        if (typeof Splide !== "undefined") initLogosCarousel();
      });
      return;
    }

    var options = {
      type: "loop",
      arrows: false,
      pagination: false,
      drag: "free",
      gap: "32px",
      fixedWidth: 200,
      breakpoints: {
        1200: {},
        860: {
          fixedWidth: 180,
        },
        600: {
          fixedWidth: 140,
          gap: "24px",
        },
      },
      autoScroll: {
        speed: 1,
        pauseOnHover: false,
      },
    };

    var splideLogos = new Splide("#lp_logos", options);
    splideLogos.mount(window.splide ? window.splide.Extensions : {});
  }

  /* ---------- FAQ Accordion ---------- */
  function initFaq() {
    var buttons = document.querySelectorAll(".lp_faq_button");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var item = btn.closest(".lp_faq_item");
        var isActive = item.classList.contains("is_active");
        // close all
        document.querySelectorAll(".lp_faq_item").forEach(function (el) {
          el.classList.remove("is_active");
          var b = el.querySelector(".lp_faq_button");
          if (b) b.setAttribute("aria-expanded", "false");
        });
        // toggle clicked
        if (!isActive) {
          item.classList.add("is_active");
          btn.setAttribute("aria-expanded", "true");
        }
      });
    });
  }

  /* ---------- Follow Header ---------- */
  function initFollowHeader() {
    var heroEl = document.getElementById("lp_hero");
    var followEl = document.getElementById("lp_follow");
    if (!heroEl || !followEl) return;

    function update() {
      var rect = heroEl.getBoundingClientRect();
      followEl.classList.toggle("is_visible", rect.bottom < 1);
    }

    window.addEventListener(
      "scroll",
      function () {
        requestAnimationFrame(update);
      },
      { passive: true },
    );
    update();
  }

  function makeRafScheduler(apply) {
    var rafId = 0;
    return function schedule() {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(apply);
    };
  }

  function bindLayoutRecalc(schedule, observeEl) {
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("load", schedule, { once: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(schedule);
    }
    if (observeEl && typeof ResizeObserver !== "undefined") {
      new ResizeObserver(schedule).observe(observeEl);
    }
    schedule();
  }

  /* ---------- Hero Scale ---------- */
  function initHeroScale() {
    var heroEl = document.getElementById("lp_hero");
    if (!heroEl) return;
    var stageEl = heroEl.querySelector(".lp_hero_scale_stage");
    var innerEl = stageEl
      ? stageEl.querySelector(".lp_hero_inner") ||
      stageEl.querySelector(".lp_shell")
      : null;
    if (!stageEl || !innerEl) return;

    var DESIGN_W = 1400;
    var GUTTER = 112;
    var MAX_W = 1400;
    var MIN_W = 960;

    function apply() {
      var vw = window.innerWidth;
      if (vw < MIN_W || vw > DESIGN_W) {
        stageEl.style.height = "";
        stageEl.style.width = "";
        stageEl.style.maxWidth = "";
        stageEl.style.margin = "";
        innerEl.style.width = "";
        innerEl.style.maxWidth = "";
        innerEl.style.margin = "";
        innerEl.style.transform = "";
        innerEl.style.transformOrigin = "";
        return;
      }
      var shellW = Math.min(Math.max(0, vw - GUTTER), MAX_W);
      var scale = shellW / DESIGN_W;
      stageEl.style.width = shellW + "px";
      stageEl.style.maxWidth = "none";
      stageEl.style.margin = "0 auto";
      innerEl.style.width = DESIGN_W + "px";
      innerEl.style.maxWidth = "none";
      innerEl.style.margin = "0";
      innerEl.style.transformOrigin = "left top";
      innerEl.style.transform = "scale(" + scale + ")";
      stageEl.style.height = Math.round(innerEl.scrollHeight * scale) + "px";
    }

    bindLayoutRecalc(makeRafScheduler(apply), innerEl);
  }

  /* ---------- Issues Scale ---------- */
  function initIssuesScale() {
    var stageEl = document.querySelector(".lp_issues_scale_stage");
    var canvasEl = document.querySelector(".lp_issues_canvas");
    if (!stageEl || !canvasEl) return;

    var DESIGN_W = 1400;
    var DESIGN_H = 350;
    var ISSUES_GUTTER = -80;
    var START_W = 1380;
    var MIN_W = 960;

    function apply() {
      var vw = window.innerWidth;
      if (vw <= MIN_W || vw > START_W) {
        stageEl.style.width = "";
        stageEl.style.maxWidth = "";
        stageEl.style.margin = "";
        stageEl.style.position = "";
        stageEl.style.left = "";
        stageEl.style.alignSelf = "";
        stageEl.style.height = "";
        canvasEl.style.width = "";
        canvasEl.style.maxWidth = "";
        canvasEl.style.transform = "";
        canvasEl.style.transformOrigin = "";
        return;
      }
      var shellW = Math.min(Math.max(0, vw - ISSUES_GUTTER), DESIGN_W);
      var parentW = stageEl.parentElement
        ? stageEl.parentElement.clientWidth
        : shellW;
      var centeredLeft = Math.round((parentW - shellW) / 2);
      var scale = shellW / DESIGN_W;
      stageEl.style.width = shellW + "px";
      stageEl.style.maxWidth = "none";
      stageEl.style.margin = "0";
      stageEl.style.position = "relative";
      stageEl.style.left = centeredLeft + "px";
      stageEl.style.alignSelf = "flex-start";
      stageEl.style.height = Math.round(DESIGN_H * scale) + "px";
      canvasEl.style.width = DESIGN_W + "px";
      canvasEl.style.maxWidth = "none";
      canvasEl.style.transformOrigin = "left top";
      canvasEl.style.transform = "scale(" + scale + ")";
    }

    bindLayoutRecalc(makeRafScheduler(apply), null);
  }

  /* ---------- WebGL Mesh Background ---------- */
  var VERT_SRC = [
    "attribute vec2 a_position;",
    "void main() { gl_Position = vec4(a_position, 0.0, 1.0); }",
  ].join("\n");

  var FRAG_SRC = [
    "precision highp float;",
    "uniform vec2 u_resolution;",
    "uniform float u_time;",
    "uniform vec2 u_points[8];",
    "uniform vec3 u_colors[8];",
    "",
    "vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}",
    "vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}",
    "vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}",
    "",
    "float snoise(vec2 v){",
    "  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);",
    "  vec2 i=floor(v+dot(v,C.yy));",
    "  vec2 x0=v-i+dot(i,C.xx);",
    "  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);",
    "  vec4 x12=x0.xyxy+C.xxzz;",
    "  x12.xy-=i1;",
    "  i=mod289(i);",
    "  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));",
    "  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);",
    "  m=m*m; m=m*m;",
    "  vec3 x=2.0*fract(p*C.www)-1.0;",
    "  vec3 h=abs(x)-0.5;",
    "  vec3 ox=floor(x+0.5);",
    "  vec3 a0=x-ox;",
    "  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);",
    "  vec3 g;",
    "  g.x=a0.x*x0.x+h.x*x0.y;",
    "  g.yz=a0.yz*x12.xz+h.yz*x12.yw;",
    "  return 130.0*dot(m,g);",
    "}",
    "",
    "void main(){",
    "  vec2 uv=gl_FragCoord.xy/u_resolution;",
    "  float aspect=u_resolution.x/u_resolution.y;",
    "  vec2 uvA=vec2(uv.x*aspect,uv.y);",
    "  float n1=snoise(uv*2.0+u_time*0.25);",
    "  float n2=snoise(uv*2.0+vec2(5.0,3.0)+u_time*0.2);",
    "  vec2 dUV=uvA+vec2(n1,n2)*0.22;",
    "  vec2 flow=vec2(sin((uv.y+u_time*0.22)*8.0),cos((uv.x-u_time*0.18)*7.0))*0.08;",
    "  dUV+=flow;",
    "  vec3 color=vec3(0.0);",
    "  float tw=0.0;",
    "  for(int i=0;i<8;i++){",
    "    vec2 pt=vec2(u_points[i].x*aspect,u_points[i].y);",
    "    float d=distance(dUV,pt);",
    "    float w=1.0/(pow(d,2.2)+0.001);",
    "    color+=u_colors[i]*w;",
    "    tw+=w;",
    "  }",
    "  color/=tw;",
    "  vec3 deepOrange=vec3(1.0,0.141,0.0);",
    "  color=mix(color,deepOrange,0.48);",
    "  float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233))+u_time)*43758.5453)*0.03-0.015;",
    "  color+=grain;",
    "  gl_FragColor=vec4(color,1.0);",
    "}",
  ].join("\n");

  function createPoints() {
    var defs = [
      { x: 0.1, y: 0.1, color: [1.0, 0.48, 0.30] },
      { x: 0.85, y: 0.15, color: [1.0, 0.14, 0.0] },
      { x: 0.5, y: 0.5, color: [1.0, 0.62, 0.50] },
      { x: 0.15, y: 0.8, color: [0.86, 0.10, 0.0] },
      { x: 0.9, y: 0.85, color: [1.0, 0.30, 0.12] },
      { x: 0.4, y: 0.2, color: [1.0, 0.14, 0.0] },
      { x: 0.7, y: 0.6, color: [0.92, 0.12, 0.0] },
      { x: 0.25, y: 0.55, color: [1.0, 0.42, 0.26] },
    ];
    return defs.map(function (d) {
      return {
        x: d.x,
        y: d.y,
        base_x: d.x,
        base_y: d.y,
        color: d.color,
        speed_x: 0.5 + Math.random() * 0.45,
        speed_y: 0.45 + Math.random() * 0.45,
        amp_x: 0.16 + Math.random() * 0.12,
        amp_y: 0.16 + Math.random() * 0.12,
        phase_x: Math.random() * Math.PI * 2,
        phase_y: Math.random() * Math.PI * 2,
      };
    });
  }

  function compileShader(gl, type, src) {
    var s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function initMeshCanvas(canvasEl) {
    if (!canvasEl) return;
    var gl = canvasEl.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) return;

    var vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    var fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vs || !fs) return;

    var prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    var aPos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    var uRes = gl.getUniformLocation(prog, "u_resolution");
    var uTime = gl.getUniformLocation(prog, "u_time");
    if (!uRes || !uTime) return;

    var uPoints = [],
      uColors = [];
    for (var i = 0; i < 8; i++) {
      uPoints.push(gl.getUniformLocation(prog, "u_points[" + i + "]"));
      uColors.push(gl.getUniformLocation(prog, "u_colors[" + i + "]"));
    }

    var points = createPoints();
    var startTime = performance.now();
    var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    var isVisible = false;
    var animId = 0;

    function resize() {
      var rect = canvasEl.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5) * 0.6;
      var w = Math.max(1, Math.round(rect.width * dpr));
      var h = Math.max(1, Math.round(rect.height * dpr));
      canvasEl.width = w;
      canvasEl.height = h;
      gl.viewport(0, 0, w, h);
    }

    function animate() {
      if (!isVisible) return;
      var ms = motionQuery.matches ? 0.2 : 1;
      var t = ((performance.now() - startTime) / 1000) * ms;
      gl.uniform2f(uRes, canvasEl.width, canvasEl.height);
      gl.uniform1f(uTime, t);
      for (var i = 0; i < 8; i++) {
        var p = points[i];
        p.x = p.base_x + Math.sin(t * p.speed_x + p.phase_x) * p.amp_x;
        p.y = p.base_y + Math.cos(t * p.speed_y + p.phase_y) * p.amp_y;
        if (uPoints[i]) gl.uniform2f(uPoints[i], p.x, p.y);
        if (uColors[i])
          gl.uniform3f(uColors[i], p.color[0], p.color[1], p.color[2]);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animId = requestAnimationFrame(animate);
    }

    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(resize).observe(canvasEl);
    }
    window.addEventListener("resize", resize);
    resize();

    if (typeof IntersectionObserver !== "undefined") {
      var observer = new IntersectionObserver(
        function (entries) {
          if (!entries || !entries.length) return;
          var wasVisible = isVisible;
          isVisible = entries[0].isIntersecting;
          if (isVisible && !wasVisible) {
            animId = requestAnimationFrame(animate);
          }
        },
        { threshold: 0 },
      );
      observer.observe(canvasEl);
    }
  }

  /* ---------- Lenis Smooth Scroll ---------- */
  function initLenis() {
    var reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return;

    var lenis = null;
    if (typeof Lenis !== "undefined") {
      var compact = window.matchMedia("(max-width: 860px)").matches;
      lenis = new Lenis({
        lerp: compact ? 0.24 : 0.18,
        wheelMultiplier: compact ? 0.92 : 1,
        touchMultiplier: compact ? 0.96 : 1,
      });

      window.__lenis = lenis;

      // integrate with GSAP if available
      if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
        gsap.registerPlugin(ScrollTrigger);
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add(function (time) {
          lenis.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);
      } else {
        // fallback RAF loop
        function raf(time) {
          lenis.raf(time);
          requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
      }
    }

    // smooth anchor scroll (lenis fallback included)
    document.addEventListener(
      "click",
      function (e) {
        var anchor = e.target.closest('a[href^="#"]');
        if (!anchor || anchor.getAttribute("href") === "#") return;
        var id = anchor.getAttribute("href").slice(1);
        if (!id) return;
        var target = document.getElementById(id);
        if (target) {
          e.preventDefault();
          if (lenis) {
            lenis.scrollTo(target, { offset: -80, duration: 1.2 });
          } else {
            var top = target.getBoundingClientRect().top + window.scrollY - 80;
            window.scrollTo({ top: top, behavior: "smooth" });
          }
        }
      },
      { capture: true },
    );
  }

  /* ---------- Popup Banner ---------- */
  function initPopupBanner() {
    var banner = document.getElementById("lp_popup_banner");
    if (!banner) return;
    var STORAGE_KEY = "miai_popup_banner_closed";

    try {
      var navEntries =
        performance.getEntriesByType &&
        performance.getEntriesByType("navigation");
      var navType = navEntries && navEntries[0] ? navEntries[0].type : "";
      if (navType === "reload") {
        sessionStorage.removeItem(STORAGE_KEY);
      }
      if (sessionStorage.getItem(STORAGE_KEY) === "1") return;
    } catch (e) { }

    banner.setAttribute("aria-hidden", "false");
    window.setTimeout(function () {
      banner.classList.add("is_visible");
    }, 600);

    var closeBtn = banner.querySelector(".lp_popup_banner_close");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        banner.classList.remove("is_visible");
        banner.setAttribute("aria-hidden", "true");
        try {
          sessionStorage.setItem(STORAGE_KEY, "1");
        } catch (e) { }
      });
    }
  }

  /* ---------- GSAP Scroll Animations ---------- */
  function initScrollAnimations() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined")
      return;
    gsap.registerPlugin(ScrollTrigger);

    var heroEl = document.getElementById("lp_hero");
    var followEl = document.getElementById("lp_follow");
    var issuesEl = document.getElementById("lp_issues");
    var solutionEl = document.getElementById("lp_solution");
    var solutionTitleEl = solutionEl
      ? solutionEl.querySelector(".subject")
      : null;
    var solutionMockEl = solutionEl
      ? solutionEl.querySelector(".lp_solution_image")
      : null;
    var pitchEl = document.getElementById("lp_pitch");
    var resultEl = document.getElementById("lp_result");
    var reasonEl = document.getElementById("lp_reason");

    // Static mode: ensure elements are visible
    if (solutionMockEl)
      gsap.set(solutionMockEl, { filter: "blur(0px)", opacity: 1 });
    if (solutionTitleEl) gsap.set(solutionTitleEl, { opacity: 1, y: 0 });
    if (issuesEl) gsap.set(issuesEl, { opacity: 1, filter: "blur(0px)" });
    if (solutionEl) gsap.set(solutionEl, { opacity: 1, filter: "blur(0px)" });
    if (resultEl) gsap.set(resultEl, { y: 0, marginBottom: 0 });
    if (pitchEl) gsap.set(pitchEl, { opacity: 1, y: 0 });
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initMicromodal();
    initLogosCarousel();
    initFaq();
    initFollowHeader();
    initHeroScale();
    initIssuesScale();
    initLenis();
    initScrollAnimations();
    initPopupBanner();

    // WebGL mesh backgrounds
    initMeshCanvas(document.getElementById("result_mesh_canvas"));
    initMeshCanvas(document.getElementById("dialogue_mesh_canvas"));
  });
})();
