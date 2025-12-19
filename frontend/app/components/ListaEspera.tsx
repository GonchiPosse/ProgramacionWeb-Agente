'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

interface ValorCuil {
  valor: string;
}

interface PacienteIngreso {
  nombre: string;
  apellido: string;
  cuil: ValorCuil;
}

interface NivelEmergenciaIngreso {
  descripcion: string;
}

interface Ingreso {
  paciente: PacienteIngreso;
  nivelEmergencia: NivelEmergenciaIngreso;
  fechaIngreso?: string;
  estado?: string;
  informe?: string;
}

interface SugerenciaPriorizacion {
  sugerido: Ingreso;
  puntaje: number;
  razones: string[];
}

interface SugerenciaOrdenItem {
  ingreso: Ingreso;
  puntaje: number;
  razones: string[];
}

interface SugerenciaOrdenResponse {
  orden: SugerenciaOrdenItem[];
}

export default function ListaEspera({
  refreshTrigger,
  onReclamoExitoso,
}: {
  refreshTrigger: number;
  onReclamoExitoso?: () => void;
}) {
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [sugerencia, setSugerencia] = useState<SugerenciaPriorizacion | null>(
    null,
  );
  const [ordenSugerido, setOrdenSugerido] = useState<SugerenciaOrdenItem[] | null>(
    null,
  );
  const [userRole, setUserRole] = useState<string>("");
  const [message, setMessage] = useState("");
  const [loadingCuil, setLoadingCuil] = useState<string>("");
  const [loadingOrden, setLoadingOrden] = useState<boolean>(false);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [ingresosAsignados, setIngresosAsignados] = useState<Ingreso[]>([]);
  const [doctorData, setDoctorData] = useState({
    nombre: "",
    apellido: "",
    cuil: "",
    matricula: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const rol: string = payload.rol || "";
      setUserRole(rol);
      const email: string = payload.email || "";
      const baseName = email.split("@")[0] || "medico";
      setDoctorData({
        nombre: baseName,
        apellido: "Cuenta",
        cuil: "20123456789",
        matricula: "MAT-DEFAULT",
      });
    } catch (error) {
      console.error("Error decodificando token:", error);
    }
  }, []);

  const cargarIngresos = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch("/api/urgencias/lista-espera");
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Error al cargar lista de espera");
      }
      const data = await res.json();
      setIngresos(data);
    } catch (err) {
      console.error(err);
      setMessage("Error al cargar lista de espera");
      setToastType("error");
    }
  }, []);

  const cargarSugerencia = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch("/api/urgencias/sugerencia");
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Error al cargar sugerencia");
      }
      const data = await res.json();
      setSugerencia(data);
    } catch (err) {
      console.error(err);
      setSugerencia(null);
    }
  }, []);

  const sugerirOrden = useCallback(async (): Promise<void> => {
    setLoadingOrden(true);
    try {
      const res: Response = await fetch("/api/urgencias/sugerencia/orden");
      if (!res.ok) {
        const txt: string = await res.text();
        throw new Error(txt || "Error al cargar sugerencia de orden");
      }
      const data: SugerenciaOrdenResponse = await res.json();
      setOrdenSugerido(data.orden);
    } catch (err) {
      console.error(err);
      setOrdenSugerido(null);
      setToastType("error");
      setMessage("Error al sugerir el orden de atención");
    }
    setLoadingOrden(false);
  }, []);

  const cargarMisIngresos = useCallback(async (): Promise<void> => {
    if (userRole !== "medico") {
      return;
    }
    try {
      const res = await fetch("/api/reclamo/mis-ingresos", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Error al cargar mis ingresos");
      }
      const data = await res.json();
      setIngresosAsignados(data);
    } catch (err) {
      console.error(err);
      setToastType("error");
      setMessage("Error al cargar mis ingresos");
    }
  }, [userRole]);

  useEffect(() => {
    cargarIngresos();
    cargarSugerencia();
  }, [cargarIngresos, cargarSugerencia, refreshTrigger]);

  useEffect(() => {
    cargarMisIngresos();
  }, [cargarMisIngresos, refreshTrigger]);

  const estadoEsEnProceso = useCallback((estado?: string): boolean => {
    if (!estado) {
      return false;
    }
    return estado.toLowerCase() === "en proceso";
  }, []);

  const doctorOcupado = useMemo(
    () => ingresosAsignados.some((ingreso) => estadoEsEnProceso(ingreso.estado)),
    [estadoEsEnProceso, ingresosAsignados],
  );

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case "Critica":
        return "#ef4444";
      case "Emergencia":
        return "#f97316";
      case "Urgencia":
        return "#eab308";
      default:
        return "#3b82f6";
    }
  };

  const handleReclamarPaciente = async (ingresoCuil?: string) => {
    if (ingresos.length === 0) {
      setToastType("error");
      setMessage("No hay nadie en la lista de espera");
      return;
    }
    if (doctorOcupado) {
      setToastType("error");
      setMessage("Ya tienes un paciente en proceso");
      return;
    }
    if (!userRole) {
      setToastType("error");
      setMessage("Debe iniciar sesión para reclamar");
      return;
    }
    const objetivo = ingresoCuil || "";
    setLoadingCuil(objetivo);
    setMessage(`Reclamando paciente ${objetivo || ""}...`);
    setToastType("success");

    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/reclamo/reclamar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({
          ...doctorData,
          ingresoCuil: ingresoCuil,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error);
      }

      setMessage(`Paciente ${objetivo || ""} reclamado exitosamente`);
      setToastType("success");
      await cargarIngresos();
      await cargarMisIngresos();
      if (onReclamoExitoso) {
        onReclamoExitoso();
      }
    } catch (err: any) {
      setToastType("error");
      setMessage("Error: " + err.message);
    }
    setLoadingCuil("");
  };

  const sugeridoCuil: string =
    sugerencia?.sugerido?.paciente?.cuil?.valor || "";

  const ordenSugeridoCuils: string[] = useMemo(() => {
    if (!ordenSugerido) {
      return [];
    }
    return ordenSugerido.map((o) => o.ingreso.paciente.cuil.valor);
  }, [ordenSugerido]);

  return (
    <>
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
            gap: "1rem",
          }}
        >
          <h3 className="title" style={{ fontSize: "1.5rem", margin: 0 }}>
            Lista de Espera
          </h3>
          {userRole === "medico" && (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                onClick={() => handleReclamarPaciente()}
                className="btn btn-primary"
                style={{ padding: "0.5rem 1rem", whiteSpace: "nowrap" }}
                disabled={!!loadingCuil || doctorOcupado}
              >
                {loadingCuil
                  ? "Reclamando..."
                  : doctorOcupado
                    ? "Ocupado"
                    : "Reclamar"}
              </button>
              <button
                onClick={() => sugerirOrden()}
                className="btn btn-secondary"
                style={{ padding: "0.5rem 1rem", whiteSpace: "nowrap" }}
                disabled={loadingOrden || doctorOcupado}
              >
                {loadingOrden ? "Sugiriendo..." : "Sugerir orden"}
              </button>
            </div>
          )}
        </div>

        {ordenSugerido && ordenSugerido.length > 0 && (
          <div
            style={{
              padding: "0.75rem",
              borderRadius: "0.75rem",
              marginBottom: "1rem",
              border: "1px solid var(--card-border)",
              background: "rgba(34, 197, 94, 0.06)",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>
              Orden sugerido de atención
            </div>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                    <th style={{ padding: "0.75rem" }}>#</th>
                    <th style={{ padding: "0.75rem" }}>Paciente</th>
                    <th style={{ padding: "0.75rem" }}>Nivel</th>
                    <th style={{ padding: "0.75rem" }}>Puntaje</th>
                    <th style={{ padding: "0.75rem" }}>Razones</th>
                    <th style={{ padding: "0.75rem" }} />
                  </tr>
                </thead>
                <tbody>
                  {ordenSugerido.map((item, idx) => {
                    const cuil: string = item.ingreso.paciente.cuil.valor;
                    const razones: string = item.razones.join(" · ");
                    return (
                      <tr
                        key={`${cuil}-${idx}`}
                        style={{ borderBottom: "1px solid var(--card-border)" }}
                      >
                        <td style={{ padding: "0.75rem", fontWeight: 700 }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: "0.75rem" }}>
                          {item.ingreso.paciente.nombre}{" "}
                          {item.ingreso.paciente.apellido}
                        </td>
                        <td style={{ padding: "0.75rem" }}>
                          <span
                            style={{
                              padding: "0.25rem 0.75rem",
                              borderRadius: "999px",
                              fontSize: "0.875rem",
                              background: `${getNivelColor(
                                item.ingreso.nivelEmergencia.descripcion,
                              )}20`,
                              color: getNivelColor(
                                item.ingreso.nivelEmergencia.descripcion,
                              ),
                            }}
                          >
                            {item.ingreso.nivelEmergencia.descripcion}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem" }}>{item.puntaje}</td>
                        <td style={{ padding: "0.75rem", color: "var(--secondary)" }}>
                          {razones}
                        </td>
                        <td style={{ padding: "0.75rem" }}>
                          {userRole === "medico" && (
                            <button
                              onClick={() => handleReclamarPaciente(cuil)}
                              className="btn btn-primary"
                              style={{ padding: "0.35rem 0.75rem" }}
                              disabled={!!loadingCuil || doctorOcupado}
                            >
                              Reclamar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {sugerencia && (
          <div
            style={{
              padding: "0.75rem",
              borderRadius: "0.75rem",
              marginBottom: "1rem",
              border: "1px solid var(--card-border)",
              background: "rgba(59,130,246,0.06)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "1rem",
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>
                Sugerencia del experto
              </div>
              <div style={{ color: "var(--secondary)", marginBottom: "0.5rem" }}>
                {sugerencia.sugerido.paciente.nombre}{" "}
                {sugerencia.sugerido.paciente.apellido} —{" "}
                {sugerencia.sugerido.nivelEmergencia.descripcion} (puntaje{" "}
                {sugerencia.puntaje})
              </div>
              {sugerencia.razones.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                  {sugerencia.razones.map((r, idx) => (
                    <li key={idx} style={{ color: "var(--secondary)" }}>
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {userRole === "medico" && (
              <button
                onClick={() => handleReclamarPaciente(sugeridoCuil)}
                className="btn btn-primary"
                style={{ padding: "0.5rem 1rem", whiteSpace: "nowrap" }}
                disabled={!!loadingCuil || doctorOcupado || !sugeridoCuil}
              >
                Reclamar sugerido
              </button>
            )}
          </div>
        )}

        {message && (
          <div
            style={{
              padding: "0.75rem",
              borderRadius: "0.5rem",
              marginBottom: "1rem",
              background:
                toastType === "error"
                  ? "rgba(239, 68, 68, 0.1)"
                  : "rgba(34, 197, 94, 0.1)",
              color:
                toastType === "error" ? "var(--error)" : "var(--success)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            {loadingCuil && toastType !== "error" && (
              <span
                className="spinner"
                style={{
                  width: "16px",
                  height: "16px",
                  border: "2px solid var(--primary)",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "spin 0.8s linear infinite",
                }}
              />
            )}
            <span>{message}</span>
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                <th style={{ padding: "1rem" }}>Paciente</th>
                <th style={{ padding: "1rem" }}>CUIL</th>
                <th style={{ padding: "1rem" }}>Nivel</th>
                <th style={{ padding: "1rem" }}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {ingresos.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: "1rem",
                      textAlign: "center",
                      color: "var(--secondary)",
                    }}
                  >
                    No hay pacientes en espera
                  </td>
                </tr>
              ) : (
                ingresos.map((ingreso, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: "1px solid var(--card-border)",
                      background:
                        ordenSugeridoCuils.length > 0 &&
                        ordenSugeridoCuils.includes(ingreso.paciente.cuil.valor)
                          ? "rgba(34, 197, 94, 0.05)"
                          : "transparent",
                    }}
                  >
                    <td style={{ padding: "1rem" }}>
                      {ingreso.paciente.nombre} {ingreso.paciente.apellido}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      {ingreso.paciente.cuil.valor}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <span
                        style={{
                          padding: "0.25rem 0.75rem",
                          borderRadius: "999px",
                          fontSize: "0.875rem",
                          background: `${getNivelColor(
                            ingreso.nivelEmergencia.descripcion,
                          )}20`,
                          color: getNivelColor(
                            ingreso.nivelEmergencia.descripcion,
                          ),
                        }}
                      >
                        {ingreso.nivelEmergencia.descripcion}
                      </span>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <span>{new Date().toLocaleDateString()}</span>
                        {userRole === "medico" && (
                          <button
                            onClick={() =>
                              handleReclamarPaciente(
                                ingreso.paciente.cuil.valor,
                              )
                            }
                            className="btn"
                            style={{
                              padding: "0.35rem 0.5rem",
                              minWidth: "2.5rem",
                              background: "rgba(59,130,246,0.15)",
                              opacity:
                                loadingCuil === ingreso.paciente.cuil.valor ||
                                doctorOcupado
                                  ? 0.6
                                  : 1,
                              cursor:
                                loadingCuil === ingreso.paciente.cuil.valor ||
                                doctorOcupado
                                  ? "wait"
                                  : "pointer",
                            }}
                            aria-label="Reclamar paciente"
                            disabled={
                              loadingCuil === ingreso.paciente.cuil.valor ||
                              doctorOcupado
                            }
                          >
                            {loadingCuil === ingreso.paciente.cuil.valor
                              ? "..."
                              : "⚡"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}
