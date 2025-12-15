import { Request, Response } from 'express';
import { UrgenciaService } from '../../service/urgenciaService.js';
import { Enfermera } from '../../../models/enfermera.js';
import { NivelEmergencia, NivelEmergenciaCodigo } from '../../../models/nivelEmergencia.js';
import { Paciente } from '../../../models/paciente.js';
import { RepoPacientes } from '../../interface/repoPacientes.js';
import { Cuil } from '../../../models/valueobjects/cuil.js';
import { Email } from '../../../models/valueobjects/email.js';
import { Afiliado } from '../../../models/afiliado.js';
import { ObraSocial } from '../../../models/obraSocial.js';
import { Domicilio } from '../../../models/domicilio.js';
import { ResultadoPriorizacion } from '../../service/agentePriorizacion.js';

export class UrgenciasController {
  private urgenciaService: UrgenciaService;
  private repoPacientes: RepoPacientes;

  public constructor(urgenciaService: UrgenciaService, repoPacientes: RepoPacientes) {
    this.urgenciaService = urgenciaService;
    this.repoPacientes = repoPacientes;
  }

    public async crearPaciente(req: Request, res: Response): Promise<void> {
    try {
      const { nombre, apellido, cuil, obraSocial, email, numeroAfiliado, calle, numero, localidad } = req.body;
      
      if (!cuil || cuil.trim() === "") {
        res.status(400).json({ error: 'Se debe completar el campo: Cuil' });
        return;
      }
      if (!apellido || apellido.trim() === "") {
        res.status(400).json({ error: 'Se debe completar el campo: Apellido' });
        return;
      }
      if (!nombre || nombre.trim() === "") {
        res.status(400).json({ error: 'Se debe completar el campo: Nombre' });
        return;
      }
      if (!calle || calle.trim() === "" || !numero || numero.trim() === "" || !localidad || localidad.trim() === "") {
        res.status(400).json({ error: 'Se debe completar el campo: Domicilio' });
        return;
      }
      
      const cuilSanitized = cuil.replace(/\D/g, '');
      const cuilObj: Cuil = new Cuil(cuilSanitized);
      const emailObj: Email = new Email(email || `${nombre.toLowerCase()}.${apellido.toLowerCase()}@example.com`);
      const obraSocialObj: ObraSocial = new ObraSocial("1", obraSocial || "");
      const afiliado: Afiliado = new Afiliado(obraSocialObj, numeroAfiliado || "00000000");
      const domicilio: Domicilio = new Domicilio(calle, numero, localidad);
      
      const paciente: Paciente = new Paciente(cuilObj, nombre, apellido, emailObj, afiliado, domicilio);
      this.repoPacientes.guardarPaciente(paciente);
      
      res.status(201).json({ message: 'Paciente creado exitosamente', paciente });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      res.status(400).json({ error: errorMessage });
    }
  }

  public async registrarUrgencia(req: Request, res: Response): Promise<void> {
    try {
      const {
        cuil,
        enfermera,
        informe,
        nivelEmergencia,
        temperatura,
        frecuenciaCardiaca,
        frecuenciaRespiratoria,
        frecuenciaSistolica,
        frecuenciaDiastolica
      } = req.body;

      const nivelEmergenciaObj = this.obtenerNivelEmergencia(nivelEmergencia);
      const cuilEnfermeraSanitized = (enfermera.cuil || "27123456789").replace(/\D/g, '');
      const cuilEnfermera: Cuil = new Cuil(cuilEnfermeraSanitized);
      const emailEnfermera: Email = new Email(enfermera.email || `${enfermera.nombre.toLowerCase()}.${enfermera.apellido.toLowerCase()}@example.com`);
      const enfermeraObj: Enfermera = new Enfermera(
        cuilEnfermera,
        enfermera.nombre,
        enfermera.apellido,
        emailEnfermera,
        enfermera.matricula || "ENF00000"
      );

      this.urgenciaService.registrarUrgencia({
        cuil,
        enfermera: enfermeraObj,
        informe,
        nivelEmergencia: nivelEmergenciaObj,
        temperatura,
        frecuenciaCardiaca,
        frecuenciaRespiratoria,
        frecuenciaSistolica,
        frecuenciaDiastolica
      });

      res.status(201).json({ message: 'Urgencia registrada exitosamente' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      res.status(400).json({ error: errorMessage });
    }
  }

  public async obtenerListaEspera(req: Request, res: Response): Promise<void> {
    try {
      const ingresosPendientes = this.urgenciaService.obtenerIngresosPendientes();
      res.status(200).json(ingresosPendientes.map((ingreso) => ingreso.toJSON()));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({ error: errorMessage });
    }
  }

  public async obtenerSugerenciaPriorizacion(req: Request, res: Response): Promise<void> {
    try {
      const sugerencia: ResultadoPriorizacion | null = this.urgenciaService.sugerirProximoIngreso();
      if (!sugerencia) {
        res.status(200).json(null);
        return;
      }
      res.status(200).json({
        sugerido: sugerencia.ingreso.toJSON(),
        puntaje: sugerencia.puntaje,
        razones: sugerencia.razones,
        nivelEmergencia: sugerencia.nivelEmergencia,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({ error: errorMessage });
    }
  }

  public async obtenerSugerenciaOrden(req: Request, res: Response): Promise<void> {
    try {
      const orden: ResultadoPriorizacion[] = this.urgenciaService.sugerirOrdenDeAtencion();
      res.status(200).json({
        orden: orden.map((item) => ({
          ingreso: item.ingreso.toJSON(),
          puntaje: item.puntaje,
          razones: item.razones,
          nivelEmergencia: item.nivelEmergencia,
        })),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({ error: errorMessage });
    }
  }

  public async obtenerTodosLosPacientes(req: Request, res: Response): Promise<void> {
    try {
      const pacientes = this.repoPacientes.obtenerTodos();
      res.status(200).json(pacientes);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({ error: errorMessage });
    }
  }

  private obtenerNivelEmergencia(nivel: string): NivelEmergencia {
    const niveles = [
      NivelEmergencia.CRITICA,
      NivelEmergencia.EMERGENCIA,
      NivelEmergencia.URGENCIA,
      NivelEmergencia.URGENCIA_MENOR,
      NivelEmergencia.SIN_URGENCIA
    ];

    const nivelEncontrado = niveles.find(n => n.descripcion === nivel);
    if (!nivelEncontrado) {
      throw new Error(`Nivel de emergencia '${nivel}' no válido`);
    }
    return nivelEncontrado;
  }
}
