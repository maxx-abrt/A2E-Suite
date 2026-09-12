"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { GlassCard } from "@/components/glass-card"
import { Cerfa15059Data } from "@/lib/cerfa-15059/types"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "@/components/iconsax"

interface Props {
  data: Cerfa15059Data
  onChange: (data: Cerfa15059Data) => void
}

export default function StepQualitative({ data, onChange }: Props) {
  const q = data.qualitative

  function patchQualitative<K extends keyof Cerfa15059Data["qualitative"]>(
    key: K,
    value: Cerfa15059Data["qualitative"][K],
  ) {
    const next: Cerfa15059Data = JSON.parse(JSON.stringify(data))
    next.qualitative[key] = value
    onChange(next)
  }

  return (
    <div className="space-y-4">
      <GlassCard className="p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider">Identification de l'association</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Nom de l'association</Label>
            <Input value={q.associationName} onChange={(e) => patchQualitative("associationName", e.target.value)} />
          </div>
          <div>
            <Label>Numéro SIRET</Label>
            <Input value={q.siret} maxLength={14} onChange={(e) => patchQualitative("siret", e.target.value)} placeholder="12345678900012" />
          </div>
          <div>
            <Label>Numéro RNA ou récépissé préfectoral</Label>
            <Input value={q.rnaOrReceipt} onChange={(e) => patchQualitative("rnaOrReceipt", e.target.value)} />
          </div>
          <div>
            <Label>Date d'inscription au registre Alsace-Moselle (si applicable)</Label>
            <Input type="date" value={q.alsaceMoselleRegistryDate || ""} onChange={(e) => patchQualitative("alsaceMoselleRegistryDate", e.target.value || undefined)} />
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider">Mise en œuvre de l'action</h2>
        <div className="space-y-4">
          <div>
            <Label>Description précise de la mise en œuvre</Label>
            <Textarea value={q.actionImplementation} onChange={(e) => patchQualitative("actionImplementation", e.target.value)} rows={5} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Nombre approximatif de bénéficiaires</Label>
              <Input type="number" min={0} value={q.beneficiariesCount || ""} onChange={(e) => patchQualitative("beneficiariesCount", parseInt(e.target.value) || 0)} />
            </div>
          </div>

          {/* Beneficiaries by audience */}
          <div>
            <Label className="mb-2 block">Répartition par type de publics</Label>
            <div className="space-y-2">
              {q.beneficiariesByAudience.map((ba, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input placeholder="Type de public" value={ba.audienceType} onChange={(e) => {
                    const next = JSON.parse(JSON.stringify(data))
                    next.qualitative.beneficiariesByAudience[idx].audienceType = e.target.value
                    onChange(next)
                  }} />
                  <Input type="number" min={0} placeholder="Nombre" className="w-28" value={ba.count || ""} onChange={(e) => {
                    const next = JSON.parse(JSON.stringify(data))
                    next.qualitative.beneficiariesByAudience[idx].count = parseInt(e.target.value) || 0
                    onChange(next)
                  }} />
                  <Button variant="ghost" size="icon" onClick={() => {
                    const next = JSON.parse(JSON.stringify(data))
                    next.qualitative.beneficiariesByAudience.splice(idx, 1)
                    onChange(next)
                  }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                const next = JSON.parse(JSON.stringify(data))
                next.qualitative.beneficiariesByAudience.push({ audienceType: "", count: 0 })
                onChange(next)
              }}><Plus className="h-3.5 w-3.5" /> Ajouter un public</Button>
            </div>
          </div>

          {/* Action dates */}
          <div>
            <Label className="mb-2 block">Date(s) de réalisation</Label>
            <div className="flex flex-wrap gap-2">
              {q.actionDates.map((date, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <Input type="date" value={date} onChange={(e) => {
                    const next = JSON.parse(JSON.stringify(data))
                    next.qualitative.actionDates[idx] = e.target.value
                    onChange(next)
                  }} />
                  <Button variant="ghost" size="icon" onClick={() => {
                    const next = JSON.parse(JSON.stringify(data))
                    next.qualitative.actionDates.splice(idx, 1)
                    onChange(next)
                  }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                const next = JSON.parse(JSON.stringify(data))
                next.qualitative.actionDates.push("")
                onChange(next)
              }}><Plus className="h-3.5 w-3.5" /> Ajouter une date</Button>
            </div>
          </div>

          {/* Action locations */}
          <div>
            <Label className="mb-2 block">Lieu(x) de réalisation</Label>
            <div className="space-y-2">
              {q.actionLocations.map((loc, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input value={loc} onChange={(e) => {
                    const next = JSON.parse(JSON.stringify(data))
                    next.qualitative.actionLocations[idx] = e.target.value
                    onChange(next)
                  }} />
                  <Button variant="ghost" size="icon" onClick={() => {
                    const next = JSON.parse(JSON.stringify(data))
                    next.qualitative.actionLocations.splice(idx, 1)
                    onChange(next)
                  }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                const next = JSON.parse(JSON.stringify(data))
                next.qualitative.actionLocations.push("")
                onChange(next)
              }}><Plus className="h-3.5 w-3.5" /> Ajouter un lieu</Button>
            </div>
          </div>

          <div>
            <Label>Objectifs atteints au regard des indicateurs utilisés</Label>
            <Textarea value={q.objectivesAchievement} onChange={(e) => patchQualitative("objectivesAchievement", e.target.value)} rows={5} />
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
