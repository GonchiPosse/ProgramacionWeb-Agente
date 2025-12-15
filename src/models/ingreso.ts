import { Paciente } from "./paciente.js";
import { Enfermera } from "./enfermera.js";
import { NivelEmergencia } from "./nivelEmergencia.js";
import { EstadoIngreso } from "./estadoIngreso.js";
import { TensionArterial } from "./valueobjects/tensionArterial.js";
import { FrecuenciaCardiaca } from "./valueobjects/frecuenciaCardiaca.js";
import { FrecuenciaRespiratoria } from "./valueobjects/frecuenciaRespiratoria.js";
import { Temperatura } from "./valueobjects/temperatura.js";
import { Doctor } from "./doctor.js";

interface IngresoArgs {
  paciente: Paciente;
  enfermera: Enfermera;
  informe: string;
  nivelEmergencia: NivelEmergencia;
  estado?: EstadoIngreso;
  fechaIngreso?: Date;
  temperatura: number;
  frecuenciaCardiaca: number;
  frecuenciaRespiratoria: number;
  frecuenciaSistolica: number;
  frecuenciaDiastolica: number;
}

export class Ingreso {
  private paciente: Paciente;
  private enfermera: Enfermera;
  private fechaIngreso: Date;
  private informe: string;
  private nivelEmergencia: NivelEmergencia;
  private estado: EstadoIngreso;
  private temperatura: Temperatura;
  private frecuenciaCardiaca: FrecuenciaCardiaca;
  private frecuenciaRespiratoria: FrecuenciaRespiratoria;
  private tensionArterial: TensionArterial;
  private doctor: Doctor | null;

  public constructor(args: IngresoArgs) {
    this.paciente = args.paciente;
    this.enfermera = args.enfermera;
    this.fechaIngreso = args.fechaIngreso ?? new Date();
    this.informe = args.informe;
    this.nivelEmergencia = args.nivelEmergencia;
    this.estado = args.estado || EstadoIngreso.PENDIENTE;
    this.temperatura = new Temperatura(args.temperatura);
    this.frecuenciaCardiaca = new FrecuenciaCardiaca(args.frecuenciaCardiaca);
    this.frecuenciaRespiratoria = new FrecuenciaRespiratoria(
      args.frecuenciaRespiratoria,
    );
    this.tensionArterial = new TensionArterial(
      args.frecuenciaSistolica,
      args.frecuenciaDiastolica,
    );
    this.doctor = null;
  }

  public compararCon(ingreso: Ingreso): number {
    const comparacion = this.nivelEmergencia.compararCon(
      ingreso.nivelEmergencia,
    );

    if (comparacion === 0) {
      return this.fechaIngreso.getTime() - ingreso.fechaIngreso.getTime();
    }
    return comparacion;
  }

  get CuilPaciente(): string {
    return this.paciente.Cuil.formatearConGuiones();
  }

  get NivelEmergencia(): NivelEmergencia {
    return this.nivelEmergencia;
  }

  get FechaIngreso(): Date {
    return this.fechaIngreso;
  }

  get Informe(): string {
    return this.informe;
  }

  get Temperatura(): number {
    return this.temperatura.Valor;
  }

  get FrecuenciaCardiaca(): number {
    return this.frecuenciaCardiaca.Valor;
  }

  get FrecuenciaRespiratoria(): number {
    return this.frecuenciaRespiratoria.Valor;
  }

  get TensionArterialSistolica(): number {
    return this.tensionArterial.Sistolica;
  }

  get TensionArterialDiastolica(): number {
    return this.tensionArterial.Diastolica;
  }

  get Estado(): EstadoIngreso {
    return this.estado;
  }

  get DoctorAsignado(): Doctor | null {
    return this.doctor;
  }

  public cambiarEstado(nuevoEstado: EstadoIngreso): void {
    this.estado = nuevoEstado;
  }

  public asignarDoctor(doctor: Doctor): void {
    if (this.estado === EstadoIngreso.EN_PROCESO || this.doctor) {
      throw new Error("El paciente ya está siendo atendido por otro médico.");
    }
    this.doctor = doctor;
    this.estado = EstadoIngreso.EN_PROCESO;
  }

  public toJSON(): object {
    return {
      paciente: this.paciente,
      enfermera: this.enfermera,
      fechaIngreso: this.fechaIngreso,
      informe: this.informe,
      nivelEmergencia: this.nivelEmergencia,
      estado: this.estado,
      temperatura: this.temperatura,
      frecuenciaCardiaca: this.frecuenciaCardiaca,
      frecuenciaRespiratoria: this.frecuenciaRespiratoria,
      tensionArterial: this.tensionArterial,
      doctor: this.doctor,
    };
  }
}
