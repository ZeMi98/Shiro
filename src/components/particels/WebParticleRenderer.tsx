// ============================================================================
// Base WebGL Particle Renderer
// ============================================================================
class BaseParticleRenderer {
  protected canvas: HTMLCanvasElement
  protected gl: WebGLRenderingContext
  protected program: WebGLProgram | null = null
  protected animationId: number | null = null
  protected width = 0
  protected height = 0
  protected dpr = 1

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: true,
    })

    if (!gl) throw new Error('WebGL not supported')
    this.gl = gl

    this.resize()
    window.addEventListener('resize', this.handleResize)
  }

  protected resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight

    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`
    this.canvas.width = Math.round(this.width * this.dpr)
    this.canvas.height = Math.round(this.height * this.dpr)

    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
  }

  protected createShader(type: number, source: string): WebGLShader | null {
    const shader = this.gl.createShader(type)
    if (!shader) return null

    this.gl.shaderSource(shader, source)
    this.gl.compileShader(shader)

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', this.gl.getShaderInfoLog(shader))
      this.gl.deleteShader(shader)
      return null
    }

    return shader
  }

  protected createProgram(
    vertexSource: string,
    fragmentSource: string,
  ): WebGLProgram | null {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource)
    const fragmentShader = this.createShader(
      this.gl.FRAGMENT_SHADER,
      fragmentSource,
    )

    if (!vertexShader || !fragmentShader) return null

    const program = this.gl.createProgram()
    if (!program) return null

    this.gl.attachShader(program, vertexShader)
    this.gl.attachShader(program, fragmentShader)
    this.gl.linkProgram(program)

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Program link error:', this.gl.getProgramInfoLog(program))
      return null
    }

    return program
  }

  private handleResize = (): void => {
    // 添加这个方法
    this.resize()
  }
  start(): void {
    // Override in subclass
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  destroy(): void {
    this.stop()
    if (this.program) {
      this.gl.deleteProgram(this.program)
    }
    window.removeEventListener('resize', this.handleResize)
  }
}

export default BaseParticleRenderer
