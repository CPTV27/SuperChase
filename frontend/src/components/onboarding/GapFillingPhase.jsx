import { useState } from 'react'
import { motion } from 'framer-motion'
import { HelpCircle } from 'lucide-react'

export function GapFillingPhase({ questions, onSubmit }) {
  const [answers, setAnswers] = useState({})

  const handleAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const allAnswered = questions
    .filter(q => q.required)
    .every(q => answers[q.id])

  const handleSubmit = () => {
    if (allAnswered) {
      onSubmit(answers)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">
              Just {questions.length} Quick Question{questions.length !== 1 ? 's' : ''}
            </h2>
            <p className="text-zinc-400 text-sm">
              Research couldn't find these - your input is needed
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((question, index) => (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl"
          >
            <label className="block text-white font-medium mb-3">
              {question.question}
              {question.required && (
                <span className="text-red-400 ml-1">*</span>
              )}
            </label>

            {question.options ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {question.options.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleAnswer(question.id, option.value)}
                    className={`
                      p-4 rounded-xl text-left transition-all
                      min-h-[56px] border
                      ${answers[question.id] === option.value
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-zinc-900/50 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                      }
                    `}
                  >
                    <span className="font-medium">{option.label}</span>
                    {option.description && (
                      <span className="block text-xs mt-1 opacity-70">
                        {option.description}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="text"
                value={answers[question.id] || ''}
                onChange={(e) => handleAnswer(question.id, e.target.value)}
                placeholder="Type your answer..."
                className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-700
                         rounded-xl text-white min-h-[56px]
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         placeholder-zinc-500"
              />
            )}
          </motion.div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!allAnswered}
        className={`
          w-full py-4 font-semibold rounded-xl min-h-[56px]
          transition-colors
          ${allAnswered
            ? 'bg-blue-600 hover:bg-blue-500 text-white'
            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          }
        `}
      >
        Complete Onboarding
      </button>
    </motion.div>
  )
}

export default GapFillingPhase
