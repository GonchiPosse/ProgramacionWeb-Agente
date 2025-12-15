import { RepoPacientes } from "../interface/repoPacientes.js";
import { Ingreso } from "../../models/ingreso.js";
import { Enfermera } from "../../models/enfermera.js";
import { Doctor } from "../../models/doctor.js";
import { NivelEmergencia } from "../../models/nivelEmergencia.js";
import { EstadoIngreso } from "../../models/estadoIngreso.js";
import { Temperatura } from "../../models/valueobjects/temperatura.js";
import { FrecuenciaCardiaca } from "../../models/valueobjects/frecuenciaCardiaca.js";
import { FrecuenciaRespiratoria } from "../../models/valueobjects/frecuenciaRespiratoria.js";
import { TensionArterial } from "../../models/valueobjects/tensionArterial.js";
import { Atencion } from "../../models/atencion.js";
import { AgentePriorizacion, ResultadoPriorizacion } from "./agentePriorizacion.js";

interface RegistrarUrgenciaArgs {
  cuil: string;
  enfermera: Enfermera;
  informe: string;
  nivelEmergencia: NivelEmergencia;
  temperatura: number;
  frecuenciaCardiaca: number;
  frecuenciaRespiratoria: number;
  frecuenciaSistolica: number;
  frecuenciaDiastolica: number;
}

export class UrgenciaService {
  private repoPacientes: RepoPacientes;
  private listaEspera: Ingreso[] = [];
  private atenciones: Atencion[] = [];
  private agentePriorizacion: AgentePriorizacion;

  public constructor(
    repoPacientes: RepoPacientes,
    agentePriorizacion: AgentePriorizacion = new AgentePriorizacion(),
  ) {
    this.repoPacientes = repoPacientes;
    this.agentePriorizacion = agentePriorizacion;
  }

  public registrarUrgencia({
    cuil,
    enfermera,
    informe,
    nivelEmergencia,
    temperatura,
    frecuenciaCardiaca,
    frecuenciaRespiratoria,
    frecuenciaSistolica,
    frecuenciaDiastolica,
  }: RegistrarUrgenciaArgs): void {
    new Temperatura(temperatura);
    new FrecuenciaCardiaca(frecuenciaCardiaca);
    new FrecuenciaRespiratoria(frecuenciaRespiratoria);
    new TensionArterial(frecuenciaSistolica, frecuenciaDiastolica);

    const paciente = this.repoPacientes.obtenerPacientePorCuil(cuil);

    const ingreso = new Ingreso({
      paciente,
      enfermera,
      informe,
      nivelEmergencia,
      temperatura,
      frecuenciaCardiaca,
      frecuenciaRespiratoria,
      frecuenciaSistolica,
      frecuenciaDiastolica,
    });

    this.listaEspera.push(ingreso);
    this.listaEspera.sort((a, b) => a.compararCon(b));
  }

  public obtenerIngresosPendientes(): Ingreso[] {
    return this.obtenerIngresosPendientesOrdenados();
  }

  public sugerirProximoIngreso(): ResultadoPriorizacion | null {
    const pendientes: Ingreso[] = this.obtenerIngresosPendientesOrdenados();
    return this.agentePriorizacion.sugerir(pendientes, new Date());
  }

  public sugerirOrdenDeAtencion(): ResultadoPriorizacion[] {
    const pendientes: Ingreso[] = this.obtenerIngresosPendientesOrdenados();
    return this.agentePriorizacion.sugerirOrden(pendientes, new Date());
  }

  public registrarAtencion(
    doctor: Doctor,
    cuilPaciente: string,
    informe: string,
  ): Atencion {
    const ingresoObjetivo: Ingreso = this.buscarIngresoAsignado(
      cuilPaciente,
      doctor,
    );
    if (ingresoObjetivo.Estado === EstadoIngreso.FINALIZADO) {
      throw new Error("El ingreso ya fue finalizado.");
    }
    const atencion = new Atencion({
      ingreso: ingresoObjetivo,
      informe,
      doctor,
    });
    ingresoObjetivo.cambiarEstado(EstadoIngreso.FINALIZADO);
    this.atenciones.push(atencion);
    return atencion;
  }

  public reclamarPaciente(doctor: Doctor, cuilPaciente?: string): Ingreso {
    this.validarDisponibilidadDelDoctor(doctor);
    const ingresosPendientes: Ingreso[] =
      this.obtenerIngresosPendientesOrdenados();

    if (ingresosPendientes.length === 0) {
      throw new Error("No hay pacientes en la lista de espera.");
    }

    const ingresoObjetivo: Ingreso | undefined =
      cuilPaciente && cuilPaciente.trim() !== ""
        ? ingresosPendientes.find(
            (ingreso) =>
              this.normalizarCuil(ingreso.CuilPaciente) ===
              this.normalizarCuil(cuilPaciente),
          )
        : ingresosPendientes[0];

    if (!ingresoObjetivo) {
      throw new Error("No se encontró el paciente seleccionado en espera.");
    }

    ingresoObjetivo.asignarDoctor(doctor);
    return ingresoObjetivo;
  }

  public reclamarProximoPaciente(doctor: Doctor): Ingreso {
    return this.reclamarPaciente(doctor);
  }

  public obtenerIngresosDelDoctor(email: string): Ingreso[] {
    return this.listaEspera.filter(
      (ingreso) =>
        ingreso.DoctorAsignado !== null &&
        ingreso.DoctorAsignado.Email.Valor === email,
    );
  }

  public obtenerAtencionesDelDoctor(email: string): Atencion[] {
    return this.atenciones.filter(
      (atencion) => atencion.Doctor.Email.Valor === email,
    );
  }

  private validarDisponibilidadDelDoctor(doctor: Doctor): void {
    const tieneIngresoEnProceso: boolean = this.listaEspera.some(
      (ingreso) =>
        ingreso.DoctorAsignado !== null &&
        ingreso.DoctorAsignado.Email.Valor === doctor.Email.Valor &&
        ingreso.Estado === EstadoIngreso.EN_PROCESO,
    );
    if (tieneIngresoEnProceso) {
      throw new Error("El médico ya tiene un paciente en proceso.");
    }
  }

  private obtenerIngresosPendientesOrdenados(): Ingreso[] {
    const pendientes: Ingreso[] = this.listaEspera.filter(
      (ingreso) => ingreso.Estado === EstadoIngreso.PENDIENTE,
    );
    pendientes.sort((a, b) => a.compararCon(b));
    return pendientes;
  }

  private normalizarCuil(valor: string): string {
    return valor.replace(/\D/g, "");
  }

  private buscarIngresoAsignado(
    cuilPaciente: string,
    doctor: Doctor,
  ): Ingreso {
    const cuilNormalizado: string = this.normalizarCuil(cuilPaciente);
    const ingresoObjetivo = this.listaEspera.find(
      (ingreso) =>
        this.normalizarCuil(ingreso.CuilPaciente) === cuilNormalizado,
    );
    if (!ingresoObjetivo) {
      throw new Error("No se encontró el ingreso solicitado.");
    }
    if (!ingresoObjetivo.DoctorAsignado) {
      throw new Error("El paciente no tiene un médico asignado.");
    }
    if (ingresoObjetivo.DoctorAsignado.Email.Valor !== doctor.Email.Valor) {
      throw new Error("Solo puede registrar la atención el médico asignado.");
    }
    if (ingresoObjetivo.Estado !== EstadoIngreso.EN_PROCESO) {
      throw new Error("El ingreso no está en proceso de atención.");
    }
    return ingresoObjetivo;
  }
}
