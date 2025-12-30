import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import Api from "./api/Api";
import "./App.css";
import { toHHMM } from "./Timer";

const periodLabels = {
  hour: 'Dernière heure',
  day: 'Dernières 24h',
  days2: '2 derniers jours',
  week: 'Dernière semaine',
  thisweek: 'Cette semaine'
};

function Stats() {
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState('day');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async (selectedPeriod) => {
    setLoading(true);
    setError(null);
    try {
      const response = await Api.getStats(selectedPeriod);
      setStats(response);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError(error.message);
      setStats(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStats(period);
  }, [period]);


  return (
    <div className="App">
      <header className="App-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '400px', marginBottom: '20px' }}>
          <Link 
            to="/"
            style={{ 
              padding: '8px 12px',
              backgroundColor: '#4a5568',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            Retour
          </Link>
          <h2 style={{ margin: 0, fontSize: '24px' }}>Statistiques</h2>
          <div style={{ width: '80px' }}></div>
        </div>

        <div style={{ width: '100%', maxWidth: '400px', marginBottom: '30px' }}>
          <select
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
            }}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#2d3748',
              color: '#e0e0e0',
              border: '1px solid #4a5568',
              borderRadius: '8px',
              fontSize: '16px',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23a0a0a0' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 12px center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '16px',
              paddingRight: '40px'
            }}
          >
            <option value="hour">Dernière heure</option>
            <option value="day">Dernières 24h</option>
            <option value="days2">2 derniers jours</option>
            <option value="week">Dernière semaine</option>
            <option value="thisweek">Cette semaine</option>
          </select>
        </div>

        {stats && (
          <div style={{ width: '100%', maxWidth: '400px', marginBottom: '20px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#a0a0a0' }}>
              Période commençant le {new Date(stats.period_start).toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })} à {new Date(stats.period_start).toLocaleTimeString('fr-FR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </p>
          </div>
        )}

        {loading ? (
          <div style={{ color: '#a0a0a0', fontSize: '16px' }}>Chargement...</div>
        ) : error ? (
          <div style={{ color: '#f56565', fontSize: '16px' }}>
            Erreur: {error}
          </div>
        ) : stats ? (
          <div style={{ width: '100%', maxWidth: '400px' }}>
            <h3 style={{ color: '#7dd3fc', fontSize: '18px', marginBottom: '20px' }}>
              {periodLabels[period]}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ 
                backgroundColor: '#2d3748', 
                padding: '16px', 
                borderRadius: '8px',
                border: '1px solid #4a5568'
              }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#ffd700', fontSize: '16px' }}>
                  💤 Sommeil
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#e0e0e0' }}>
                    <strong>Total:</strong> {toHHMM(stats.sleep_time / 1000)}
                  </p>
                  <p style={{ margin: 0, fontSize: '14px', color: '#e0e0e0' }}>
                    <strong>Siestes:</strong> {stats.sleep_count} fois
                  </p>
                  {stats.sleep_count > 0 && (
                    <p style={{ margin: 0, fontSize: '14px', color: '#e0e0e0' }}>
                      <strong>Durée moyenne:</strong> {toHHMM(stats.average_sleep_time / 1000)}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ 
                backgroundColor: '#2d3748', 
                padding: '16px', 
                borderRadius: '8px',
                border: '1px solid #4a5568'
              }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#e879f9', fontSize: '16px' }}>
                  🍼 Allaitement
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#e0e0e0' }}>
                    <strong>Sein gauche:</strong> {stats.left_boob_count} fois ({toHHMM(stats.left_boob_duration / 1000)} au total)
                  </p>
                  <p style={{ margin: 0, fontSize: '14px', color: '#e0e0e0' }}>
                    <strong>Sein droit:</strong> {stats.right_boob_count} fois ({toHHMM(stats.right_boob_duration / 1000)} au total)
                  </p>
                  <p style={{ margin: 0, fontSize: '14px', color: '#7dd3fc', fontWeight: 'bold' }}>
                    Total: {stats.left_boob_count + stats.right_boob_count} fois ({toHHMM((stats.left_boob_duration + stats.right_boob_duration) / 1000)})
                  </p>
                </div>
              </div>

              <div style={{ 
                backgroundColor: '#2d3748', 
                padding: '16px', 
                borderRadius: '8px',
                border: '1px solid #4a5568'
              }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#4ade80', fontSize: '16px' }}>
                  🚽 Changes
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#e0e0e0' }}>
                    💧 Pipis: {stats.pee_count}
                  </p>
                  <p style={{ margin: 0, fontSize: '14px', color: '#e0e0e0' }}>
                    💩 Cacas: {stats.poop_count}
                  </p>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div style={{ color: '#a0a0a0', fontSize: '16px' }}>
            Aucune donnée disponible
          </div>
        )}
      </header>
    </div>
  );
}

export default Stats;