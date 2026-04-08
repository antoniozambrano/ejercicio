import { useState, useEffect } from 'react'
import YouTube from 'react-youtube'
import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

function App() {
  const [ejercicios, setEjercicios] = useState([])
  const [pesos, setPesos] = useState({}) // Ahora guarda { id, peso, fecha }
  const [nuevosPesos, setNuevosPesos] = useState({})
  const [loading, setLoading] = useState(true)

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
  const handleGuardar = async (ejercicioId) => {
    const peso = nuevosPesos[ejercicioId]
    if (!peso || peso <= 0) {
      alert('Por favor, ingresa un peso válido')
      return
    }

    try {
      const { error } = await supabase
        .from('registros_peso')
        .insert([
          {
            ejercicio_id: ejercicioId,
            peso: parseFloat(peso),
            fecha: new Date().toISOString()
          }
        ])

      if (error) throw error

      alert('Peso guardado exitosamente')

      // Recargar los datos para obtener el registro actualizado
      fetchEjercicios()

      // Limpiar el input
      setNuevosPesos(prev => ({
        ...prev,
        [ejercicioId]: ''
      }))
    } catch (error) {
      console.error('Error al guardar peso:', error.message)
      alert('Error al guardar el peso')
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
          .select('id, peso, fecha')
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
        {/* Sección de Calentamientos */}
        {ejercicios.filter(e => e.dia_rutina === 'Calentamientos').length > 0 && (
          <>
            <h2 className="text-2xl font-bold text-emerald-400 mt-8 mb-4 border-b border-slate-700 pb-2">
              Calentamientos
            </h2>
            <div className="space-y-6">
              {ejercicios.filter(e => e.dia_rutina === 'Calentamientos').map((ejercicio) => (
                <div
                  key={ejercicio.id}
                  className="bg-slate-800 rounded-lg p-6 shadow-lg border border-slate-700"
                >
                  {/* Nombre del ejercicio */}
                  <h3 className="text-xl font-semibold text-white mb-4">
                    {ejercicio.nombre}
                  </h3>

                  {/* Video embebido de YouTube */}
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
                      onEnd={(event) => {
                        event.target.seekTo(ejercicio.inicio)
                        event.target.playVideo()
                      }}
                      className="w-full aspect-video rounded-lg"
                      iframeClassName="w-full h-full rounded-lg"
                    />
                    {/* Bloqueo de clics (Anti-distracciones) */}
                    <div className="absolute inset-0 z-10"></div>
                  </div>

                  {/* Peso anterior */}
                  <div className="mb-4">
                    <p className="text-gray-300">
                      Peso anterior:{' '}
                      <span className="font-semibold text-white">
                        {pesos[ejercicio.id]
                          ? `${pesos[ejercicio.id].peso} kg (${formatearFecha(pesos[ejercicio.id].fecha)})`
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

                  {/* Input para nuevo peso y botón guardar */}
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
                    <button
                      onClick={() => handleGuardar(ejercicio.id)}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Sección de Entrenamiento - Día 1 */}
        {ejercicios.filter(e => e.dia_rutina === 'Día 1').length > 0 && (
          <>
            <h2 className="text-2xl font-bold text-emerald-400 mt-8 mb-4 border-b border-slate-700 pb-2">
              Entrenamiento - Día 1
            </h2>
            <div className="space-y-6">
              {ejercicios.filter(e => e.dia_rutina === 'Día 1').map((ejercicio) => (
                <div
                  key={ejercicio.id}
                  className="bg-slate-800 rounded-lg p-6 shadow-lg border border-slate-700"
                >
                  {/* Nombre del ejercicio */}
                  <h3 className="text-xl font-semibold text-white mb-4">
                    {ejercicio.nombre}
                  </h3>

                  {/* Video embebido de YouTube */}
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
                      onEnd={(event) => {
                        event.target.seekTo(ejercicio.inicio)
                        event.target.playVideo()
                      }}
                      className="w-full aspect-video rounded-lg"
                      iframeClassName="w-full h-full rounded-lg"
                    />
                    {/* Bloqueo de clics (Anti-distracciones) */}
                    <div className="absolute inset-0 z-10"></div>
                  </div>

                  {/* Peso anterior */}
                  <div className="mb-4">
                    <p className="text-gray-300">
                      Peso anterior:{' '}
                      <span className="font-semibold text-white">
                        {pesos[ejercicio.id]
                          ? `${pesos[ejercicio.id].peso} kg (${formatearFecha(pesos[ejercicio.id].fecha)})`
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

                  {/* Input para nuevo peso y botón guardar */}
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
                    <button
                      onClick={() => handleGuardar(ejercicio.id)}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
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
