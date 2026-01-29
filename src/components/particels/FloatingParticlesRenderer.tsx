import BaseParticleRenderer from './WebParticleRenderer'

class FloatingParticlesRenderer extends BaseParticleRenderer {
  private particles: Float32Array
  private velocities: Float32Array
  private sizes: Float32Array
  private offsets: Float32Array
  private particleCount: number
  private time = 0

  constructor(canvas: HTMLCanvasElement, particleCount = 80) {
    super(canvas)
    this.particleCount = particleCount
    this.particles = new Float32Array(particleCount * 2)
    this.velocities = new Float32Array(particleCount * 2)
    this.sizes = new Float32Array(particleCount)
    this.offsets = new Float32Array(particleCount)

    this.initParticles()
    this.initWebGL()
  }

  private initParticles(): void {
    for (let i = 0; i < this.particleCount; i++) {
      this.particles[i * 2] = Math.random() * 2 - 1
      this.particles[i * 2 + 1] = Math.random() * 2 - 1
      this.velocities[i * 2] = (Math.random() - 0.5) * 0.001
      this.velocities[i * 2 + 1] = (Math.random() - 0.5) * 0.001
      this.sizes[i] = 2 + Math.random() * 6 // 从 2-6 改为 4-12，更大更明显
      this.offsets[i] = Math.random() * 6.28318530718 // 0..2PI 随机相位
    }
  }

  private initWebGL(): void {
    const vertexShader = `
    precision mediump float;
    attribute vec2 a_position;
    attribute float a_size;
    attribute float a_offset;
    uniform float u_time;
    varying float v_offset;
    
    void main() {
      v_offset = a_offset;
      vec2 pos = a_position;
      // 每个粒子带有自己的相位偏移，产生不同的浮动节奏
      pos.y += sin(u_time * 0.001 + a_position.x * 3.0 + a_offset) * 0.05;
      // 轻微基于偏移的大小抖动，让点看起来活一些
      gl_Position = vec4(pos, 0.0, 1.0);
      gl_PointSize = a_size * (0.75 + 0.5 * (0.5 + 0.5 * sin(u_time * 0.002 + a_offset)));
    }
  `

    const fragmentShader = `
    precision mediump float;
    uniform float u_time;
    varying float v_offset;
    
    void main() {
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      
      // 每个粒子独立抖动，相位由 v_offset 提供
      float pulse = 0.75 + 0.25 * sin(u_time * 0.003 + v_offset);
      float alpha = smoothstep(0.5, 0.0, dist) * pulse;
      
      // 粉、绿、蓝三色渐变，使用 v_offset 打乱节奏和相位
      vec3 pink = vec3(1.0, 0.4, 0.7);
      vec3 green = vec3(0.4, 0.9, 0.6);
      vec3 blue = vec3(0.3, 0.7, 1.0);
      
      float t = sin(u_time * 0.001 + v_offset * 0.5) * 0.5 + 0.5;
      vec3 color;
      if (t < 0.33) {
        color = mix(pink, green, t * 3.0);
      } else if (t < 0.66) {
        color = mix(green, blue, (t - 0.33) * 3.0);
      } else {
        color = mix(blue, pink, (t - 0.66) * 3.0);
      }
      
      gl_FragColor = vec4(color, alpha * 0.85);
    }
  `

    this.program = this.createProgram(vertexShader, fragmentShader)
    if (!this.program) return

    this.gl.useProgram(this.program)
    this.gl.enable(this.gl.BLEND)
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)
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
    this.time = performance.now()

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
    if (!this.program) return

    this.gl.clearColor(0, 0, 0, 0)
    this.gl.clear(this.gl.COLOR_BUFFER_BIT)
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

    const sizeBuffer = this.gl.createBuffer()
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, sizeBuffer)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.sizes, this.gl.STATIC_DRAW)

    const sizeLoc = this.gl.getAttribLocation(this.program, 'a_size')
    this.gl.enableVertexAttribArray(sizeLoc)
    this.gl.vertexAttribPointer(sizeLoc, 1, this.gl.FLOAT, false, 0, 0)

    // offsets buffer
    const offsetBuffer = this.gl.createBuffer()
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, offsetBuffer)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.offsets, this.gl.STATIC_DRAW)

    const offsetLoc = this.gl.getAttribLocation(this.program, 'a_offset')
    this.gl.enableVertexAttribArray(offsetLoc)
    this.gl.vertexAttribPointer(offsetLoc, 1, this.gl.FLOAT, false, 0, 0)

    const timeLoc = this.gl.getUniformLocation(this.program, 'u_time')
    this.gl.uniform1f(timeLoc, this.time)

    this.gl.drawArrays(this.gl.POINTS, 0, this.particleCount)

    this.gl.deleteBuffer(positionBuffer)
    this.gl.deleteBuffer(sizeBuffer)
    this.gl.deleteBuffer(offsetBuffer)
  }
}

export default FloatingParticlesRenderer
