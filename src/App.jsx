import { useState, useEffect } from 'react'
import YouTube from 'react-youtube'
import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Subcomponente ExerciseCard para manejar el estado del reproductor de cada video
const ExerciseCard = ({ ejercicio, pesos, nuevosPesos, handlePesoChange, handleGuardar, eliminarPeso, formatearFecha, extractVideoId, onRefresh }) => {
  const [player, setPlayer] = useState(null)
  const [numSeries, setNumSeries] = useState(3)
  const [reps, setReps] = useState({})

  // Identificación de Calentamientos
  const isCalentamiento = ejercicio.dia_rutina === 'Calentamientos'

  // Lógica de "Hecho hoy"
  const registro = pesos[ejercicio.id]
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const fechaRegistro = registro ? new Date(registro.fecha) : null
  fechaRegistro?.setHours(0, 0, 0, 0)
  const completadoHoy = registro && fechaRegistro && fechaRegistro.getTime() === hoy.getTime()

  const handleVideoClick = () => {
    if (player) {
      const playerState = player.getPlayerState()
      if (playerState === 1) { // 1 significa que está reproduciendo
        player.pauseVideo()
      } else {
        player.playVideo()
      }
    }
  }

  const handleNumSeriesChange = (value) => {
    const num = parseInt(value) || 0
    setNumSeries(num)
    // Inicializar reps para las nuevas series
    const newReps = { ...reps }
    for (let i = 0; i < num; i++) {
      if (!(i in newReps)) {
        newReps[i] = ''
      }
    }
    setReps(newReps)
  }

  const handleRepChange = (index, value) => {
    setReps(prev => ({
      ...prev,
      [index]: value
    }))
  }

  return (
    <div className={`bg-slate-800 rounded-lg p-6 shadow-lg border ${completadoHoy ? 'border-emerald-500 bg-emerald-900/20' : 'border-slate-700'}`}>
      {/* Nombre del ejercicio */}
      <h3 className="text-xl font-semibold text-white mb-4">
        {ejercicio.nombre}
      </h3>

      {/* Video embebido de YouTube con control Play/Pause */}
      <div className="mb-4 relative aspect-video">
        <YouTube
          videoId={extractVideoId(ejercicio.video_url)}
          opts={{
            playerVars: {
              autoplay: 0,
              start: ejercicio.inicio,
              end: ejercicio.fin,
              rel: 0,
              modestbranding: 1,
            },
          }}
          onReady={(e) => setPlayer(e.target)}
          onEnd={(event) => {
            event.target.seekTo(ejercicio.inicio)
            event.target.playVideo()
          }}
          className="w-full aspect-video rounded-lg"
          iframeClassName="w-full h-full rounded-lg"
        />
        {/* Escudo transparente con control Play/Pause */}
        <div
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={handleVideoClick}
        ></div>
      </div>

      {/* Peso anterior */}
      <div className="mb-4">
        <p className="text-gray-300">
          {isCalentamiento ? (
            <>
              Última vez:{' '}
              <span className="font-semibold text-white">
                {registro ? formatearFecha(registro.fecha) : 'Sin registro'}
              </span>
              {registro && (
                <button
                  onClick={() => eliminarPeso(registro.id)}
                  className="text-red-500 hover:text-red-400 font-bold ml-2"
                  title="Eliminar registro"
                >
                  X
                </button>
              )}
            </>
          ) : (
            <>
              Anterior:{' '}
              <span className="font-semibold text-white">
                {registro
                  ? `${registro.peso} kg | ${registro.series || 0} series: (${registro.reps || '-'}) | ${formatearFecha(registro.fecha)}`
                  : 'Sin registro'}
              </span>
              {registro && (
                <button
                  onClick={() => eliminarPeso(registro.id)}
                  className="text-red-500 hover:text-red-400 font-bold ml-2"
                  title="Eliminar registro"
                >
                  X
                </button>
              )}
            </>
          )}
        </p>
      </div>

      {/* Inputs - Diferenciados por tipo de ejercicio */}
      {isCalentamiento ? (
        <div className="space-y-4">
          <button
            onClick={() => {
              handleGuardar(ejercicio.id, 0, {}, true)
              if (onRefresh) onRefresh()
            }}
            className="w-full px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800"
          >
            Marcar como Completado
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <label htmlFor={`peso-${ejercicio.id}`} className="sr-only">
                Nuevo peso
              </label>
              <input
                id={`peso-${ejercicio.id}`}
                type="number"
                step="0.5"
                min="0"
                placeholder="Nuevo peso (kg)"
                value={nuevosPesos[ejercicio.id] || ''}
                onChange={(e) => handlePesoChange(ejercicio.id, e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="w-20">
              <label htmlFor={`series-${ejercicio.id}`} className="sr-only">
                Número de series
              </label>
              <input
                id={`series-${ejercicio.id}`}
                type="number"
                min="1"
                max="10"
                placeholder="Series"
                value={numSeries}
                onChange={(e) => handleNumSeriesChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
              />
            </div>
          </div>
          
          {/* Inputs dinámicos de reps */}
          {numSeries > 0 && (
            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-slate-300 text-sm">Reps:</span>
              {Array.from({ length: numSeries }, (_, i) => (
                <input
                  key={i}
                  type="text"
                  inputMode="numeric"
                  placeholder={`${i + 1}`}
                  value={reps[i] || ''}
                  onChange={(e) => handleRepChange(i, e.target.value)}
                  className="w-12 px-2 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-sm"
                />
              ))}
            </div>
          )}

          <button
            onClick={() => {
              handleGuardar(ejercicio.id, numSeries, reps, false)
              if (onRefresh) onRefresh()
            }}
            className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800"
          >
            Guardar
          </button>
        </div>
      )}
    </div>
  )
}

function App() {
  const [ejercicios, setEjercicios] = useState([])
  const [pesos, setPesos] = useState({})
  const [nuevosPesos, setNuevosPesos] = useState({})
  const [loading, setLoading] = useState(true)
  const [seccionesAbiertas, setSeccionesAbiertas] = useState(['Calentamientos'])
  const [ejerciciosAbiertos, setEjerciciosAbiertos] = useState([])
  const [completadosHoy, setCompletadosHoy] = useState([])

  // Función para toggle de secciones
  const toggleSeccion = (nombre) => {
    setSeccionesAbiertas(prev => {
      if (prev.includes(nombre)) {
        return prev.filter(sec => sec !== nombre)
      } else {
        return [...prev, nombre]
      }
    })
  }

  // Función para toggle de ejercicios
  const toggleEjercicio = (id) => {
    setEjerciciosAbiertos(prev => {
      if (prev.includes(id)) {
        return prev.filter(ejercicioId => ejercicioId !== id)
      } else {
        return [...prev, id]
      }
    })
  }

  // Función para extraer el ID del video de YouTube
  const extractVideoId = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get('v') || url.split('/').pop();
    } catch (e) {
      return url.split('v=')[1]?.split('&')[0]; // fallback
    }
  }

  // Función para formatear la fecha
  const formatearFecha = (fecha) => {
    const date = new Date(fecha)
    const dia = String(date.getDate()).padStart(2, '0')
    const mes = String(date.getMonth() + 1).padStart(2, '0')
    const anio = date.getFullYear()
    return `${dia}/${mes}/${anio}`
  }

  // Cargar ejercicios al montar del componente
  useEffect(() => {
    const loadInitialData = async () => {
      await fetchEjercicios()
      setLoading(false)
    }
    loadInitialData()
  }, [])

  // Manejar cambio en el input de peso
  const handlePesoChange = (ejercicioId, value) => {
    setNuevosPesos(prev => ({
      ...prev,
      [ejercicioId]: value
    }))
  }

  // Guardar nuevo peso
  const handleGuardar = async (ejercicioId, numSeries = 0, reps = {}, isCalentamiento = false) => {
    // Si es calentamiento, guardar directamente sin validación
    if (isCalentamiento) {
      try {
        const { error } = await supabase
          .from('registros_peso')
          .insert([
            {
              ejercicio_id: ejercicioId,
              peso: 0,
              series: 0,
              reps: '0',
              fecha: new Date().toISOString()
            }
          ])

        if (error) throw error

        alert('Calentamiento completado exitosamente')

        // Recargar los datos para actualizar el estado de completados
        fetchEjercicios()

        return
      } catch (error) {
        console.error('Error al guardar calentamiento:', error.message)
        alert('Error al guardar el calentamiento')
        return
      }
    }

    // Validación para entrenamiento normal
    const peso = nuevosPesos[ejercicioId]
    if (!peso || peso <= 0) {
      alert('Por favor, ingresa un peso válido')
      return
    }

    // Concatenar las reps en un string separado por comas
    const repsArray = Array.from({ length: numSeries }, (_, i) => reps[i] || '').filter(r => r !== '')
    const repsString = repsArray.join(', ')

    try {
      const { error } = await supabase
        .from('registros_peso')
        .insert([
          {
            ejercicio_id: ejercicioId,
            peso: parseFloat(peso),
            series: numSeries,
            reps: repsString,
            fecha: new Date().toISOString()
          }
        ])

      if (error) throw error

      alert('Registro guardado exitosamente')

      // Recargar los datos para obtener el registro actualizado
      fetchEjercicios()

      // Limpiar los inputs
      setNuevosPesos(prev => ({
        ...prev,
        [ejercicioId]: ''
      }))
    } catch (error) {
      console.error('Error al guardar registro:', error.message)
      alert('Error al guardar el registro')
    }
  }

  // Eliminar registro de peso
  const eliminarPeso = async (registroId) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este registro de peso?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('registros_peso')
        .delete()
        .eq('id', registroId)

      if (error) throw error

      alert('Registro eliminado exitosamente')

      // Recargar los datos para obtener el registro anterior
      fetchEjercicios()
    } catch (error) {
      console.error('Error al eliminar peso:', error.message)
      alert('Error al eliminar el registro')
    }
  }

  // Función para recargar ejercicios
  const fetchEjercicios = async () => {
    try {
      const { data: ejerciciosData, error: ejerciciosError } = await supabase
        .from('ejercicios')
        .select('*')
        .in('dia_rutina', ['Calentamientos', 'Día 1'])
        .order('id', { ascending: true })

      if (ejerciciosError) throw ejerciciosError

      setEjercicios(ejerciciosData)

      // Obtener fecha actual para filtrar registros de hoy
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)

      // Para cada ejercicio, obtener el último peso registrado
      const pesosData = {}
      const completadosHoyData = []
      for (const ejercicio of ejerciciosData) {
        const { data: pesoData, error: pesoError } = await supabase
          .from('registros_peso')
          .select('id, peso, series, reps, fecha')
          .eq('ejercicio_id', ejercicio.id)
          .order('fecha', { ascending: false })
          .limit(1)

        if (!pesoError && pesoData && pesoData.length > 0) {
          pesosData[ejercicio.id] = pesoData[0]

          // Verificar si el registro es de hoy
          const fechaRegistro = new Date(pesoData[0].fecha)
          fechaRegistro.setHours(0, 0, 0, 0)
          if (fechaRegistro.getTime() === hoy.getTime()) {
            completadosHoyData.push(ejercicio.id)
          }
        }
      }
      setPesos(pesosData)
      setCompletadosHoy(completadosHoyData)
    } catch (error) {
      console.error('Error al cargar ejercicios:', error.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-gray-400 text-lg">Cargando ejercicios...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Nivel 1: Secciones (Acordeón) */}
        <div className="space-y-4">
          {/* Sección de Calentamientos */}
          {ejercicios.filter(e => e.dia_rutina === 'Calentamientos').length > 0 && (
            <>
              <button
                onClick={() => {
                  toggleSeccion('Calentamientos')
                  setEjerciciosAbiertos([])
                }}
                className="w-full px-6 py-4 bg-slate-800 hover:bg-slate-750 text-white text-xl font-semibold rounded-lg transition-colors duration-200 flex items-center justify-between"
              >
                <span>Calentamientos</span>
                <span className={`text-2xl transition-transform duration-300 ${seccionesAbiertas.includes('Calentamientos') ? 'rotate-180' : ''}`}>v</span>
              </button>

              {/* Contenedor con los ejercicios de calentamiento */}
              <div
                className={`transition-all duration-500 ease-in-out overflow-hidden space-y-2 ${seccionesAbiertas.includes('Calentamientos') ? 'max-h-[5000px] opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}
              >
                  {ejercicios.filter(e => e.dia_rutina === 'Calentamientos').map((ejercicio) => (
                    <div key={ejercicio.id}>
                      {/* Nivel 2: Nombre del ejercicio (clickeable) */}
                      <button
                        onClick={() => toggleEjercicio(ejercicio.id)}
                        className={`w-full px-4 py-3 ${completadosHoy.includes(ejercicio.id) ? 'bg-emerald-900/40 hover:bg-emerald-900/60' : 'bg-slate-700/50 hover:bg-slate-700'} text-white text-lg rounded-lg transition-colors duration-200 flex items-center justify-between border-b ${completadosHoy.includes(ejercicio.id) ? 'border-emerald-500' : 'border-slate-600'}`}
                      >
                        <span className="flex items-center gap-2">
                          {completadosHoy.includes(ejercicio.id) && <span className="text-emerald-400">✓</span>}
                          <span>{ejercicio.nombre}</span>
                        </span>
                        <span className="text-xl">{ejerciciosAbiertos.includes(ejercicio.id) ? '−' : '+'}</span>
                      </button>

                      {/* Nivel 3: Detalle del ejercicio (ExerciseCard) */}
                      {ejerciciosAbiertos.includes(ejercicio.id) && (
                        <div className="mt-2 animate-fade-in">
                          <ExerciseCard
                            ejercicio={ejercicio}
                            pesos={pesos}
                            nuevosPesos={nuevosPesos}
                            handlePesoChange={handlePesoChange}
                            handleGuardar={handleGuardar}
                            eliminarPeso={eliminarPeso}
                            formatearFecha={formatearFecha}
                            extractVideoId={extractVideoId}
                            onRefresh={fetchEjercicios}
                          />
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </>
          )}

          {/* Sección de Entrenamiento - Día 1 */}
          {ejercicios.filter(e => e.dia_rutina === 'Día 1').length > 0 && (
            <>
              <button
                onClick={() => {
                  toggleSeccion('Día 1')
                  setEjerciciosAbiertos([])
                }}
                className="w-full px-6 py-4 bg-slate-800 hover:bg-slate-750 text-white text-xl font-semibold rounded-lg transition-colors duration-200 flex items-center justify-between"
              >
                <span>Entrenamiento - Día 1</span>
                <span className={`text-2xl transition-transform duration-300 ${seccionesAbiertas.includes('Día 1') ? 'rotate-180' : ''}`}>v</span>
              </button>

              {/* Contenedor con los ejercicios del día 1 */}
              <div
                className={`transition-all duration-500 ease-in-out overflow-hidden space-y-2 ${seccionesAbiertas.includes('Día 1') ? 'max-h-[5000px] opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}
              >
                  {ejercicios.filter(e => e.dia_rutina === 'Día 1').map((ejercicio) => (
                    <div key={ejercicio.id}>
                      {/* Nivel 2: Nombre del ejercicio (clickeable) */}
                      <button
                        onClick={() => toggleEjercicio(ejercicio.id)}
                        className={`w-full px-4 py-3 ${completadosHoy.includes(ejercicio.id) ? 'bg-emerald-900/40 hover:bg-emerald-900/60' : 'bg-slate-700/50 hover:bg-slate-700'} text-white text-lg rounded-lg transition-colors duration-200 flex items-center justify-between border-b ${completadosHoy.includes(ejercicio.id) ? 'border-emerald-500' : 'border-slate-600'}`}
                      >
                        <span className="flex items-center gap-2">
                          {completadosHoy.includes(ejercicio.id) && <span className="text-emerald-400">✓</span>}
                          <span>{ejercicio.nombre}</span>
                        </span>
                        <span className="text-xl">{ejerciciosAbiertos.includes(ejercicio.id) ? '−' : '+'}</span>
                      </button>

                      {/* Nivel 3: Detalle del ejercicio (ExerciseCard) */}
                      {ejerciciosAbiertos.includes(ejercicio.id) && (
                        <div className="mt-2 animate-fade-in">
                          <ExerciseCard
                            ejercicio={ejercicio}
                            pesos={pesos}
                            nuevosPesos={nuevosPesos}
                            handlePesoChange={handlePesoChange}
                            handleGuardar={handleGuardar}
                            eliminarPeso={eliminarPeso}
                            formatearFecha={formatearFecha}
                            extractVideoId={extractVideoId}
                            onRefresh={fetchEjercicios}
                          />
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>

        {ejercicios.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">No hay ejercicios disponibles</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
