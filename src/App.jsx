import { useState, useEffect } from 'react'
import YouTube from 'react-youtube'
import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Subcomponente ExerciseCard para manejar el estado del reproductor de cada video
const ExerciseCard = ({ ejercicio, pesos, nuevosPesos, handlePesoChange, handleGuardar, eliminarPeso, formatearFecha, extractVideoId }) => {
  const [player, setPlayer] = useState(null)
  const [numSeries, setNumSeries] = useState(3)
  const [reps, setReps] = useState({})

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
    <div className="bg-slate-800 rounded-lg p-6 shadow-lg border border-slate-700">
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
          Anterior:{' '}
          <span className="font-semibold text-white">
            {pesos[ejercicio.id]
              ? `${pesos[ejercicio.id].peso} kg | ${pesos[ejercicio.id].series || 0} series: (${pesos[ejercicio.id].reps || '-'}) | ${formatearFecha(pesos[ejercicio.id].fecha)}`
              : 'Sin registro'}
          </span>
          {pesos[ejercicio.id] && (
            <button
              onClick={() => eliminarPeso(pesos[ejercicio.id].id)}
              className="text-red-500 hover:text-red-400 font-bold ml-2"
              title="Eliminar registro"
            >
              X
            </button>
          )}
        </p>
      </div>

      {/* Input para nuevo peso, series y reps */}
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
          onClick={() => handleGuardar(ejercicio.id, numSeries, reps)}
          className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800"
        >
          Guardar
        </button>
      </div>
    </div>
  )
}

function App() {
  const [ejercicios, setEjercicios] = useState([])
  const [pesos, setPesos] = useState({}) // Ahora guarda { id, peso, fecha }
  const [nuevosPesos, setNuevosPesos] = useState({})
  const [loading, setLoading] = useState(true)
  const [seccionAbierta, setSeccionAbierta] = useState('Calentamientos')
  const [ejercicioAbierto, setEjercicioAbierto] = useState(null)

  // Función para extraer el ID del video de YouTube
  const extractVideoId = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get('v') || url.split('/').pop();
    } catch (e) {
      return url.split('v=')[1]?.split('&')[0]; // fallback
    }
  }

  // Función para convertir URL de YouTube a formato embebido
  const getEmbedUrl = (videoUrl, inicio, fin) => {
    const videoId = extractVideoId(videoUrl)
    return `https://www.youtube.com/embed/${videoId}?start=${inicio}&end=${fin}`
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
  const handleGuardar = async (ejercicioId, numSeries = 0, reps = {}) => {
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

      // Para cada ejercicio, obtener el último peso registrado
      const pesosData = {}
      for (const ejercicio of ejerciciosData) {
        const { data: pesoData, error: pesoError } = await supabase
          .from('registros_peso')
          .select('id, peso, series, reps, fecha')
          .eq('ejercicio_id', ejercicio.id)
          .order('fecha', { ascending: false })
          .limit(1)

        if (!pesoError && pesoData && pesoData.length > 0) {
          pesosData[ejercicio.id] = pesoData[0]
        }
      }
      setPesos(pesosData)
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
            <button
              onClick={() => {
                setSeccionAbierta(seccionAbierta === 'Calentamientos' ? null : 'Calentamientos')
                setEjercicioAbierto(null)
              }}
              className="w-full px-6 py-4 bg-slate-800 hover:bg-slate-750 text-white text-xl font-semibold rounded-lg transition-colors duration-200 flex items-center justify-between"
            >
              <span>Calentamientos</span>
              <span className="text-2xl">{seccionAbierta === 'Calentamientos' ? '−' : '+'}</span>
            </button>
          )}

          {/* Sección de Entrenamiento - Día 1 */}
          {ejercicios.filter(e => e.dia_rutina === 'Día 1').length > 0 && (
            <button
              onClick={() => {
                setSeccionAbierta(seccionAbierta === 'Día 1' ? null : 'Día 1')
                setEjercicioAbierto(null)
              }}
              className="w-full px-6 py-4 bg-slate-800 hover:bg-slate-750 text-white text-xl font-semibold rounded-lg transition-colors duration-200 flex items-center justify-between"
            >
              <span>Entrenamiento - Día 1</span>
              <span className="text-2xl">{seccionAbierta === 'Día 1' ? '−' : '+'}</span>
            </button>
          )}
        </div>

        {/* Nivel 2 y 3: Lista de ejercicios y detalles */}
        {seccionAbierta && (
          <div className="mt-4 space-y-2">
            {ejercicios.filter(e => e.dia_rutina === seccionAbierta).map((ejercicio) => (
              <div key={ejercicio.id}>
                {/* Nivel 2: Nombre del ejercicio (clickeable) */}
                <button
                  onClick={() => setEjercicioAbierto(ejercicioAbierto === ejercicio.id ? null : ejercicio.id)}
                  className="w-full px-4 py-3 bg-slate-700/50 hover:bg-slate-700 text-white text-lg rounded-lg transition-colors duration-200 flex items-center justify-between border-b border-slate-600"
                >
                  <span>{ejercicio.nombre}</span>
                  <span className="text-xl">{ejercicioAbierto === ejercicio.id ? '−' : '+'}</span>
                </button>

                {/* Nivel 3: Detalle del ejercicio (ExerciseCard) */}
                {ejercicioAbierto === ejercicio.id && (
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
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

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
