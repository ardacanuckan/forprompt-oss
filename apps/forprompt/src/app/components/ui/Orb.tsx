"use client";

import { useEffect, useRef } from "react";
import { Renderer, Program, Color, Mesh, Triangle } from "ogl";

interface OrbProps {
  size?: number;
  hue?: number;
  hoverIntensity?: number;
  rotateOnHover?: boolean;
  forceHoverState?: boolean;
}

export function Orb({
  size = 200,
  hue = 0,
  hoverIntensity = 0.1,
  rotateOnHover = false,
  forceHoverState = false,
}: OrbProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Create renderer
    const renderer = new Renderer({
      width: size,
      height: size,
      alpha: true,
      antialias: true,
    });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    container.appendChild(gl.canvas);

    // Vertex shader
    const vertex = `
      attribute vec2 position;
      attribute vec2 uv;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 0, 1);
      }
    `;

    // Fragment shader - simplified version with subtle movement
    const fragment = `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uHoverIntensity;

      // Simplex noise function
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);

        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);

        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;

        i = mod289(i);
        vec4 p = permute(permute(permute(
          i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));

        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;

        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);

        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);

        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);

        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));

        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);

        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;

        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }

      void main() {
        vec2 uv = vUv;
        vec2 center = vec2(0.5);
        float dist = distance(uv, center);

        // Create circular mask with smooth edges
        float circle = 1.0 - smoothstep(0.35, 0.5, dist);

        // Subtle noise animation
        float noise1 = snoise(vec3(uv * 3.0, uTime * 0.3)) * 0.5 + 0.5;
        float noise2 = snoise(vec3(uv * 5.0 - 100.0, uTime * 0.2)) * 0.5 + 0.5;
        float noise3 = snoise(vec3(uv * 2.0 + 200.0, uTime * 0.25)) * 0.5 + 0.5;

        // Combine noise layers
        float combinedNoise = (noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2);

        // Subtle pulsing glow
        float pulse = sin(uTime * 0.5) * 0.1 + 0.9;

        // Create gradient from center
        float gradient = 1.0 - dist * 1.5;
        gradient = clamp(gradient, 0.0, 1.0);

        // Final color with white/gray tones (monochromatic)
        vec3 baseColor = vec3(0.9, 0.9, 0.92);
        vec3 highlightColor = vec3(1.0, 1.0, 1.0);
        vec3 color = mix(baseColor * 0.4, highlightColor, combinedNoise * gradient * pulse);

        // Apply subtle color variation based on noise
        color += vec3(combinedNoise * 0.1);

        // Edge glow
        float edgeGlow = smoothstep(0.3, 0.45, dist) * (1.0 - smoothstep(0.45, 0.5, dist));
        color += vec3(edgeGlow * 0.3);

        // Apply circular mask with soft edges
        float alpha = circle * (0.7 + combinedNoise * 0.3) * pulse;

        gl_FragColor = vec4(color, alpha * 0.8);
      }
    `;

    // Create mesh
    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new Color(1, 1, 1) },
        uHoverIntensity: { value: hoverIntensity },
      },
      transparent: true,
      depthTest: false,
    });

    const mesh = new Mesh(gl, { geometry, program });

    // Animation loop
    let animationId: number;
    const update = (t: number) => {
      animationId = requestAnimationFrame(update);
      program.uniforms.uTime.value = t * 0.001;
      renderer.render({ scene: mesh });
    };
    animationId = requestAnimationFrame(update);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      if (container.contains(gl.canvas)) {
        container.removeChild(gl.canvas);
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [size, hue, hoverIntensity]);

  return (
    <div
      ref={containerRef}
      style={{
        width: size,
        height: size,
        position: "relative",
      }}
    />
  );
}
