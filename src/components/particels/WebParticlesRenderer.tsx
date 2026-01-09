import BaseParticleRenderer from './WebParticleRenderer'

class WebParticlesRenderer extends BaseParticleRenderer {
  private particles: Float32Array
  private velocities: Float32Array
  private particleCount: number
  private mousePos = { x: 0, y: 0, aliveUntil: 0 }
  private lineProgram: WebGLProgram | null = null

  constructor(canvas: HTMLCanvasElement, particleCount = 120) {
    super(canvas)
    this.particleCount = particleCount
    this.particles = new Float32Array(particleCount * 2)
    this.velocities = new Float32Array(particleCount * 2)

    this.initParticles()
    this.initWebGL()
    this.setupMouseTracking()
  }

  private initParticles(): void {
    for (let i = 0; i < this.particleCount; i++) {
      this.particles[i * 2] = Math.random() * 2 - 1
      this.particles[i * 2 + 1] = Math.random() * 2 - 1
      // 原版速度是 0.6 像素，转换到 WebGL 坐标系 (-1 到 1)
      this.velocities[i * 2] = (Math.random() - 0.5) * 0.0012
      this.velocities[i * 2 + 1] = (Math.random() - 0.5) * 0.0012
    }
  }

  private initWebGL(): void {
    // Shader for particles (points)
    const pointVertexShader = `
      precision mediump float;
      attribute vec2 a_position;
      uniform float u_pointSize;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        gl_PointSize = u_pointSize;
      }
    `

    const pointFragmentShader = `
      precision mediump float;
      uniform vec4 u_color;
      
      void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
        float alpha = smoothstep(0.5, 0.0, dist);
        gl_FragColor = vec4(u_color.rgb, u_color.a * alpha);
      }
    `

    this.program = this.createProgram(pointVertexShader, pointFragmentShader)

    // Shader for lines
    const lineVertexShader = `
      precision mediump float;
      attribute vec2 a_position;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `

    const lineFragmentShader = `
      precision mediump float;
      uniform vec4 u_color;
      
      void main() {
        gl_FragColor = u_color;
      }
    `

    this.lineProgram = this.createProgram(lineVertexShader, lineFragmentShader)

    this.gl.enable(this.gl.BLEND)
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)
  }

  private setupMouseTracking(): void {
    const updateMouse = (x: number, y: number) => {
      this.mousePos.x = (x / this.width) * 2 - 1
      this.mousePos.y = -((y / this.height) * 2 - 1)
      this.mousePos.aliveUntil = performance.now() + 1000
    }

    window.addEventListener('mousemove', (e) =>
      updateMouse(e.clientX, e.clientY),
    )
    window.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length > 0) {
          updateMouse(e.touches[0].clientX, e.touches[0].clientY)
        }
      },
      { passive: true },
    )
  }

  start(): void {
    const render = () => {
      this.update()
      this.draw()
      this.animationId = requestAnimationFrame(render)
    }
    render()
  }

  private update(): void {
    for (let i = 0; i < this.particleCount; i++) {
      this.particles[i * 2] += this.velocities[i * 2]
      this.particles[i * 2 + 1] += this.velocities[i * 2 + 1]

      if (this.particles[i * 2] < -1) this.particles[i * 2] = 1
      if (this.particles[i * 2] > 1) this.particles[i * 2] = -1
      if (this.particles[i * 2 + 1] < -1) this.particles[i * 2 + 1] = 1
      if (this.particles[i * 2 + 1] > 1) this.particles[i * 2 + 1] = -1
    }
  }

  private draw(): void {
    if (!this.program || !this.lineProgram) return

    this.gl.clearColor(0, 0, 0, 0)
    this.gl.clear(this.gl.COLOR_BUFFER_BIT)

    // Draw connection lines first (behind particles)
    this.drawLines()

    // Draw mouse connections
    const now = performance.now()
    const remaining = Math.max(0, this.mousePos.aliveUntil - now)
    if (remaining > 0) {
      this.drawMouseLines(remaining / 1000)
    }

    // Draw particles on top
    this.gl.useProgram(this.program)

    const positionBuffer = this.gl.createBuffer()
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer)
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      this.particles,
      this.gl.DYNAMIC_DRAW,
    )

    const positionLoc = this.gl.getAttribLocation(this.program, 'a_position')
    this.gl.enableVertexAttribArray(positionLoc)
    this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 0, 0)

    // 原版粒子大小 0.5-2，平均 1.25
    const pointSizeLoc = this.gl.getUniformLocation(this.program, 'u_pointSize')
    this.gl.uniform1f(pointSizeLoc, 2.5 * this.dpr)

    const colorLoc = this.gl.getUniformLocation(this.program, 'u_color')
    this.gl.uniform4f(colorLoc, 1, 1, 1, 0.9)

    this.gl.drawArrays(this.gl.POINTS, 0, this.particleCount)
    this.gl.deleteBuffer(positionBuffer)
  }

  private drawLines(): void {
    if (!this.lineProgram) return

    const lines: number[] = []
    // 原版是 100 像素，转换到 WebGL 坐标系
    // 假设屏幕宽度约 1920，100px ≈ 0.104 in normalized coords
    const maxDist = 0.2

    for (let i = 0; i < this.particleCount; i++) {
      for (let j = i + 1; j < this.particleCount; j++) {
        const dx = this.particles[i * 2] - this.particles[j * 2]
        const dy = this.particles[i * 2 + 1] - this.particles[j * 2 + 1]
        const dist = Math.hypot(dx, dy)

        if (dist < maxDist) {
          lines.push(
            this.particles[i * 2],
            this.particles[i * 2 + 1],
            this.particles[j * 2],
            this.particles[j * 2 + 1],
          )
        }
      }
    }

    if (lines.length === 0) return

    this.gl.useProgram(this.lineProgram)

    const lineBuffer = this.gl.createBuffer()
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, lineBuffer)
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(lines),
      this.gl.STATIC_DRAW,
    )

    const positionLoc = this.gl.getAttribLocation(
      this.lineProgram,
      'a_position',
    )
    this.gl.enableVertexAttribArray(positionLoc)
    this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 0, 0)

    const colorLoc = this.gl.getUniformLocation(this.lineProgram, 'u_color')
    // 原版是 rgba(255,255,255,0.06)
    this.gl.uniform4f(colorLoc, 1, 1, 1, 0.06)

    this.gl.drawArrays(this.gl.LINES, 0, lines.length / 2)
    this.gl.deleteBuffer(lineBuffer)
  }

  private drawMouseLines(fadeRatio: number): void {
    if (!this.lineProgram) return

    const lines: number[] = []
    // 原版是 120 像素
    const maxDist = 0.24

    for (let i = 0; i < this.particleCount; i++) {
      const dx = this.particles[i * 2] - this.mousePos.x
      const dy = this.particles[i * 2 + 1] - this.mousePos.y
      const dist = Math.hypot(dx, dy)

      if (dist < maxDist) {
        lines.push(
          this.particles[i * 2],
          this.particles[i * 2 + 1],
          this.mousePos.x,
          this.mousePos.y,
        )
      }
    }

    if (lines.length === 0) return

    this.gl.useProgram(this.lineProgram)

    const lineBuffer = this.gl.createBuffer()
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, lineBuffer)
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(lines),
      this.gl.STATIC_DRAW,
    )

    const positionLoc = this.gl.getAttribLocation(
      this.lineProgram,
      'a_position',
    )
    this.gl.enableVertexAttribArray(positionLoc)
    this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 0, 0)

    const colorLoc = this.gl.getUniformLocation(this.lineProgram, 'u_color')
    // 原版 globalAlpha = 0.3 + 0.7 * t，最大0.9
    const alpha = Math.min(0.9, 0.3 + 0.7 * fadeRatio)
    this.gl.uniform4f(colorLoc, 1, 1, 1, alpha)

    this.gl.drawArrays(this.gl.LINES, 0, lines.length / 2)
    this.gl.deleteBuffer(lineBuffer)

    // Draw mouse dot (optional, like original)
    this.drawMouseDot(fadeRatio)
  }

  private drawMouseDot(fadeRatio: number): void {
    if (!this.program) return

    this.gl.useProgram(this.program)

    const mousePoint = new Float32Array([this.mousePos.x, this.mousePos.y])

    const positionBuffer = this.gl.createBuffer()
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, mousePoint, this.gl.STATIC_DRAW)

    const positionLoc = this.gl.getAttribLocation(this.program, 'a_position')
    this.gl.enableVertexAttribArray(positionLoc)
    this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 0, 0)

    const pointSizeLoc = this.gl.getUniformLocation(this.program, 'u_pointSize')
    // 原版是 2 + 2 * t，范围 2-4
    this.gl.uniform1f(pointSizeLoc, (2 + 2 * fadeRatio) * this.dpr)

    const colorLoc = this.gl.getUniformLocation(this.program, 'u_color')
    const alpha = Math.min(0.9, 0.6 * fadeRatio)
    this.gl.uniform4f(colorLoc, 1, 1, 1, alpha)

    this.gl.drawArrays(this.gl.POINTS, 0, 1)
    this.gl.deleteBuffer(positionBuffer)
  }

  destroy(): void {
    super.destroy()
    if (this.lineProgram) {
      this.gl.deleteProgram(this.lineProgram)
    }
  }
}

export default WebParticlesRenderer
