// Votación de la orientación de la prenda a partir de lo que responde la IA en los 4 giros de la foto.
// Cada respuesta dice cuánto girar ESA foto; sumado a su propio giro da el giro de la original.
// "Lo veo derecho" (0) pesa doble: es lo que el modelo acierta siempre. "De lado" no vota (no dice hacia dónde).

export type Rot = 0 | 90 | 180 | 270
export interface OrientationAnswer { rotation: Rot; sideways?: boolean }

export const ROTS: readonly Rot[] = [0, 90, 180, 270]

/** answers[i] es la respuesta para la foto girada ROTS[i]. Devuelve el giro ganador (0 si no hay votos). */
export function voteRotation(answers: (OrientationAnswer | null | undefined)[]): Rot {
  const votes = new Map<Rot, number>()
  answers.forEach((ans, i) => {
    if (!ans || ans.sideways) return
    const corr = ((ROTS[i] + ans.rotation) % 360) as Rot
    votes.set(corr, (votes.get(corr) ?? 0) + (ans.rotation === 0 ? 2 : 1))
  })
  const best = [...votes.entries()].sort((x, y) => y[1] - x[1] || x[0] - y[0])[0]
  return best ? best[0] : 0
}
