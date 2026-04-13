"use client"

import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import type React from "react"

interface DirectorStatCardProps {
  icon: React.ReactNode
  label: string
  value: number | string
  color: "blue" | "purple" | "green" | "indigo" | "orange" | "pink"
  index?: number
}

const colorStyles = {
  blue: "from-blue-500 to-blue-600 text-blue-500",
  purple: "from-purple-500 to-purple-600 text-purple-500",
  green: "from-green-500 to-green-600 text-green-500",
  indigo: "from-indigo-500 to-indigo-600 text-indigo-500",
  orange: "from-orange-500 to-orange-600 text-orange-500",
  pink: "from-pink-500 to-pink-600 text-pink-500",
}

export function DirectorStatCard({ icon, label, value, color, index = 0 }: DirectorStatCardProps) {
  const colorStyle = colorStyles[color]
  const [bgGradient, textColor] = colorStyle.split(" text-")

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, type: "spring", stiffness: 100, damping: 10 }}
      className="h-full"
    >
      <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                {typeof value === "number" ? value.toLocaleString() : value}
              </p>
            </div>
            <div className={`p-3 rounded-lg bg-gradient-to-br ${bgGradient} opacity-10`}>
              <div className={`w-6 h-6 ${textColor}`}>{icon}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
