import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'

class Vector2D {
  constructor(x, y) {
    this.x = x
    this.y = y
  }
  static random(min, max) {
    return min + Math.random() * (max - min)
  }
}

class Vector3D {
  constructor(x, y, z) {
    this.x = x
    this.y = y
    this.z = z
  }
  static random(min, max) {
    return min + Math.random() * (max - min)
  }
}

class AnimationController {
  constructor(canvas, ctx, dpr, size) {
    this.timeline = gsap.timeline({ repeat: -1 })
    this.time = 0
    this.canvas = canvas
    this.ctx = ctx
    this.dpr = dpr
    this.size = size
    this.stars = []

    this.changeEventTime = 0.32
    this.cameraZ = -400
    this.cameraTravelDistance = 3400
    this.startDotYOffset = 28
    this.viewZoom = 50
    this.numberOfStars = 8000
    this.trailLength = 120

    this.setupRandomGenerator()
    this.createStars()
    this.setupTimeline()
  }

  setupRandomGenerator() {
    const originalRandom = Math.random
    const customRandom = () => {
      let seed = 1234
      return () => {
        seed = (seed * 9301 + 49297) % 233280
        return seed / 233280
      }
    }
    Math.random = customRandom()
    this.createStars()
    Math.random = originalRandom
  }

  createStars() {
    this.stars = []
    for (let i = 0; i < this.numberOfStars; i++) {
      this.stars.push(new Star(this.cameraZ, this.cameraTravelDistance))
    }
  }

  setupTimeline() {
    this.timeline.to(this, {
      time: 1,
      duration: 15,
      repeat: -1,
      ease: 'none',
      onUpdate: () => this.render(),
    })
  }

  ease(p, g) {
    if (p < 0.5) return 0.5 * Math.pow(2 * p, g)
    return 1 - 0.5 * Math.pow(2 * (1 - p), g)
  }

  easeOutElastic(x) {
    const c4 = (2 * Math.PI) / 4.5
    if (x <= 0) return 0
    if (x >= 1) return 1
    return Math.pow(2, -8 * x) * Math.sin((x * 8 - 0.75) * c4) + 1
  }

  map(v, a1, b1, a2, b2) {
    return a2 + (b2 - a2) * ((v - a1) / (b1 - a1))
  }

  constrain(v, min, max) {
    return Math.min(Math.max(v, min), max)
  }

  lerp(a, b, t) {
    return a * (1 - t) + b * t
  }

  spiralPath(p) {
    p = this.constrain(1.2 * p, 0, 1)
    p = this.ease(p, 1.8)
    const turns = 6
    const theta = 2 * Math.PI * turns * Math.sqrt(p)
    const r = 170 * Math.sqrt(p)
    return new Vector2D(r * Math.cos(theta), r * Math.sin(theta) + this.startDotYOffset)
  }

  rotate(v1, v2, p, orientation) {
    const middle = new Vector2D((v1.x + v2.x) / 2, (v1.y + v2.y) / 2)
    const dx = v1.x - middle.x
    const dy = v1.y - middle.y
    const angle = Math.atan2(dy, dx)
    const o = orientation ? -1 : 1
    const r = Math.sqrt(dx * dx + dy * dy)
    const bounce = Math.sin(p * Math.PI) * 0.05 * (1 - p)
    return new Vector2D(
      middle.x + r * (1 + bounce) * Math.cos(angle + o * Math.PI * this.easeOutElastic(p)),
      middle.y + r * (1 + bounce) * Math.sin(angle + o * Math.PI * this.easeOutElastic(p))
    )
  }

  showProjectedDot(position, sizeFactor) {
    const t2 = this.constrain(this.map(this.time, this.changeEventTime, 1, 0, 1), 0, 1)
    const newCameraZ = this.cameraZ + this.ease(Math.pow(t2, 1.2), 1.8) * this.cameraTravelDistance
    if (position.z > newCameraZ) {
      const d = position.z - newCameraZ
      const x = (this.viewZoom * position.x) / d
      const y = (this.viewZoom * position.y) / d
      const sw = (400 * sizeFactor) / d
      this.ctx.lineWidth = sw
      this.ctx.beginPath()
      this.ctx.arc(x, y, 0.5, 0, Math.PI * 2)
      this.ctx.fill()
    }
  }

  drawStartDot() {
    if (this.time > this.changeEventTime) {
      const dy = (this.cameraZ * this.startDotYOffset) / this.viewZoom
      const pos = new Vector3D(0, dy, this.cameraTravelDistance)
      this.showProjectedDot(pos, 2.5)
    }
  }

  render() {
    const ctx = this.ctx
    if (!ctx) return

    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, this.size, this.size)

    ctx.save()
    ctx.translate(this.size / 2, this.size / 2)

    const t1 = this.constrain(this.map(this.time, 0, this.changeEventTime + 0.25, 0, 1), 0, 1)
    const t2 = this.constrain(this.map(this.time, this.changeEventTime, 1, 0, 1), 0, 1)

    ctx.rotate(-Math.PI * this.ease(t2, 2.7))

    this.drawTrail(t1)

    ctx.fillStyle = 'white'
    for (const star of this.stars) star.render(t1, this)

    this.drawStartDot()
    ctx.restore()
  }

  drawTrail(t1) {
    for (let i = 0; i < this.trailLength; i++) {
      const f = this.map(i, 0, this.trailLength, 1.1, 0.1)
      const sw = (2.0 * (1 - t1) + 4.5 * Math.sin(Math.PI * t1)) * f

      this.ctx.fillStyle = 'white'
      this.ctx.lineWidth = sw

      const pathTime = t1 - 0.00015 * i
      const position = this.spiralPath(pathTime)

      const basePos = position
      const offset = new Vector2D(position.x + 5, position.y + 5)
      const rotated = this.rotate(
        basePos,
        offset,
        Math.sin(this.time * Math.PI * 2) * 0.5 + 0.5,
        i % 2 === 0
      )

      this.ctx.beginPath()
      this.ctx.arc(rotated.x, rotated.y, sw / 2, 0, Math.PI * 2)
      this.ctx.fill()
    }
  }

  pause() {
    this.timeline.pause()
  }

  resume() {
    this.timeline.play()
  }

  destroy() {
    this.timeline.kill()
  }
}

class Star {
  constructor(cameraZ, cameraTravelDistance) {
    this.angle = Math.random() * Math.PI * 2
    this.distance = 30 * Math.random() + 15
    this.rotationDirection = Math.random() > 0.5 ? 1 : -1
    this.expansionRate = 1.2 + Math.random() * 0.8
    this.finalScale = 0.7 + Math.random() * 0.6

    this.dx = this.distance * Math.cos(this.angle)
    this.dy = this.distance * Math.sin(this.angle)

    this.spiralLocation = (1 - Math.pow(1 - Math.random(), 3.0)) / 1.3
    this.z = Vector2D.random(0.5 * cameraZ, cameraTravelDistance + cameraZ)

    const lerp = (a, b, t) => a * (1 - t) + b * t
    this.z = lerp(this.z, cameraTravelDistance / 2, 0.3 * this.spiralLocation)
    this.strokeWeightFactor = Math.pow(Math.random(), 2.0)
  }

  render(p, controller) {
    const spiralPos = controller.spiralPath(this.spiralLocation)
    const q = p - this.spiralLocation
    if (q <= 0) return

    const disp = controller.constrain(4 * q, 0, 1)
    const lin = disp
    const elas = controller.easeOutElastic(disp)
    const pow2 = Math.pow(disp, 2)

    let easing
    if (disp < 0.3) easing = controller.lerp(lin, pow2, disp / 0.3)
    else if (disp < 0.7) {
      const t = (disp - 0.3) / 0.4
      easing = controller.lerp(pow2, elas, t)
    } else easing = elas

    let x, y
    if (disp < 0.3) {
      x = controller.lerp(spiralPos.x, spiralPos.x + this.dx * 0.3, easing / 0.3)
      y = controller.lerp(spiralPos.y, spiralPos.y + this.dy * 0.3, easing / 0.3)
    } else if (disp < 0.7) {
      const m = (disp - 0.3) / 0.4
      const curve = Math.sin(m * Math.PI) * this.rotationDirection * 1.5
      const baseX = spiralPos.x + this.dx * 0.3
      const baseY = spiralPos.y + this.dy * 0.3
      const targetX = spiralPos.x + this.dx * 0.7
      const targetY = spiralPos.y + this.dy * 0.7
      const perpX = -this.dy * 0.4 * curve
      const perpY = this.dx * 0.4 * curve
      x = controller.lerp(baseX, targetX, m) + perpX * m
      y = controller.lerp(baseY, targetY, m) + perpY * m
    } else {
      const f = (disp - 0.7) / 0.3
      const baseX = spiralPos.x + this.dx * 0.7
      const baseY = spiralPos.y + this.dy * 0.7
      const targetD = this.distance * this.expansionRate * 1.5
      const turns = 1.2 * this.rotationDirection
      const a = this.angle + turns * f * Math.PI
      const tx = spiralPos.x + targetD * Math.cos(a)
      const ty = spiralPos.y + targetD * Math.sin(a)
      x = controller.lerp(baseX, tx, f)
      y = controller.lerp(baseY, ty, f)
    }

    const vx = (this.z - controller.cameraZ) * x / controller.viewZoom
    const vy = (this.z - controller.cameraZ) * y / controller.viewZoom
    const pos = new Vector3D(vx, vy, this.z)

    let size = 1.0
    if (disp < 0.6) size = 1.0 + disp * 0.2
    else {
      const t = (disp - 0.6) / 0.4
      size = 1.2 * (1.0 - t) + this.finalScale * t
    }
    const dot = 15.0 * this.strokeWeightFactor * size
    controller.showProjectedDot(pos, dot)
  }
}

export function SpiralAnimation() {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  })

  useEffect(() => {
    const onResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight })
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const size = Math.max(dimensions.width, dimensions.height)

    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${dimensions.width}px`
    canvas.style.height = `${dimensions.height}px`
    ctx.scale(dpr, dpr)

    animationRef.current = new AnimationController(canvas, ctx, dpr, size)
    return () => {
      animationRef.current?.destroy()
      animationRef.current = null
    }
  }, [dimensions])

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  )
}
