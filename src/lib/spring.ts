// Muelle físico (como las animaciones de iOS): posición que persigue un objetivo con rebote.
// stiffness = rigidez (rapidez), damping = amortiguación (menos = más rebote).
export class Spring {
  value: number
  velocity = 0
  target: number
  constructor(v: number, public stiffness = 420, public damping = 28, public mass = 1) {
    this.value = v
    this.target = v
  }
  /** Avanza dt segundos. Devuelve true mientras siga moviéndose. */
  step(dt: number) {
    // integración en pasos pequeños para que sea estable aunque baje la tasa de refresco
    const steps = Math.max(1, Math.ceil(dt / (1 / 240)))
    const h = dt / steps
    for (let i = 0; i < steps; i++) {
      const force = -this.stiffness * (this.value - this.target) - this.damping * this.velocity
      this.velocity += (force / this.mass) * h
      this.value += this.velocity * h
    }
    const moving = Math.abs(this.velocity) > 0.01 || Math.abs(this.value - this.target) > 0.01
    if (!moving) { this.value = this.target; this.velocity = 0 }
    return moving
  }
}
