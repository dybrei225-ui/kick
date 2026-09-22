/**
 * KICK ANALYTICS MX — DATA PROVIDER FACTORY (Fase 5, Req 39)
 * Fabrica centralizada de proveedores que desacopla completamente las vistas
 * de la implementación concreta (MOCK, MANUAL, REAL).
 */

import { KickDataProvider, ProviderType } from './KickDataProvider';
import { MockKickDataProvider } from './MockKickDataProvider';
import { ManualKickDataProvider } from './ManualKickDataProvider';
import { RealKickDataProvider } from './RealKickDataProvider';

export class DataProviderFactory {
  private static mockInstance: MockKickDataProvider | null = null;
  private static manualInstance: ManualKickDataProvider | null = null;
  private static realInstance: RealKickDataProvider | null = null;

  public static getProvider(type: ProviderType): KickDataProvider {
    switch (type) {
      case 'real':
        if (!this.realInstance) {
          this.realInstance = new RealKickDataProvider();
        }
        return this.realInstance;

      case 'manual':
        if (!this.manualInstance) {
          this.manualInstance = new ManualKickDataProvider();
        }
        return this.manualInstance;

      case 'mock':
      default:
        if (!this.mockInstance) {
          this.mockInstance = new MockKickDataProvider();
        }
        return this.mockInstance;
    }
  }

  public static getRealProvider(): RealKickDataProvider {
    if (!this.realInstance) {
      this.realInstance = new RealKickDataProvider();
    }
    return this.realInstance;
  }

  public static getMockProvider(): MockKickDataProvider {
    if (!this.mockInstance) {
      this.mockInstance = new MockKickDataProvider();
    }
    return this.mockInstance;
  }

  public static getManualProvider(): ManualKickDataProvider {
    if (!this.manualInstance) {
      this.manualInstance = new ManualKickDataProvider();
    }
    return this.manualInstance;
  }
}
