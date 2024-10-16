// interfaces
interface IEvent {
  type(): string;
  machineId(): string;
}
interface ISubscriber {
  handle(event: IEvent): void;
}

interface IPublishSubscribeService {
  publish (event: IEvent): void;
  subscribe (type: string, handler: ISubscriber): void;
  unsubscribe (type: string, handler: ISubscriber): void;
}

// 1.1 allow iSubscriber to register against an concrete IPublishSubscribeService object for an event type.
// implement the publish method, so that when a publish event occurs, all subscribers of that event type published will have a chance to handle the event.
//work
class PublishSubscribeService implements IPublishSubscribeService{
  subscribers: Map <string, Set<ISubscriber>> = new Map()
  machines: Machine[] = [];

  publish(event: IEvent): void {
    const eventType : string = event.type()
    const handlers = this.subscribers.get(eventType)
    
    if (handlers){
      handlers.forEach(handler => handler.handle(event))
    }
  }

  
  subscribe(type: string, handler: ISubscriber): void {
    
    if (!this.subscribers.get(type)){
    this.subscribers.set(type, new Set([handler]))
    } else {
      this.subscribers.get(type)?.add(handler)
    }
  }

  unsubscribe(type: string, handler: ISubscriber): void {
    if (!this.subscribers.get(type)){
      throw new Error (`${type} not found`)
    }
    else {
      this.subscribers.get(type)?.delete(handler)
    }
  }
   
}


// implementations
class MachineSaleEvent implements IEvent {
  constructor(private readonly _sold: number, private readonly _machineId: string) {}
  
  machineId(): string {
    return this._machineId;
  }
  
  getSoldQuantity(): number {
    return this._sold
  }
  
  type(): string {
    return 'sale';
  }
}

class MachineRefillEvent implements IEvent {
  constructor(private readonly _refill: number, private readonly _machineId: string) {}
  
  machineId(): string {
    return this._machineId;
  }
  refillQty(): number {
    
    return this._refill
  }
  
  type(): string {
    return 'machineRefill'
  }
}
class LowStockWarningEvent implements IEvent {
    constructor(private readonly _machineId: string) {}

    machineId(): string {
      return this._machineId;
    }

    type(): string {
      return 'lowStockWarning';
    }
}

class StockLevelOkEvent implements IEvent{
  constructor(private readonly _machineId: string){}

  machineId(): string {
    return this._machineId;
  }
  type(): string {
    return 'stockLevelOk';
  }
}

class MachineSaleSubscriber implements ISubscriber {
  public machines: Machine[];

  constructor (private publishService: PublishSubscribeService, machines: Machine[]) {
    this.machines = machines; 
  }
// removed the hardcoded index of 2 from the original code
  handle(event: MachineSaleEvent): void {
    const machineIndex = this.machines.findIndex(machine => machine.id === event.machineId())
    if (machineIndex !== -1){
      this.machines[machineIndex].stockLevel -= event.getSoldQuantity();
      if (this.machines[machineIndex].stockLevel <3){
        this.publishService.publish(new LowStockWarningEvent(this.machines[machineIndex].id))
      } else {
        this.publishService.publish(new StockLevelOkEvent(this.machines[machineIndex].id))
      }



    } else {
      console.log(`no matched machine with id: ${event.machineId()}`)
    }
  }
}

class MachineRefillSubscriber implements ISubscriber {
  machines: Machine[]
    
  constructor(private publishService: PublishSubscribeService, machines: Machine[]){
    this.machines = machines
  }

  handle(event: MachineRefillEvent): void {
   
   const machineIndex = this.machines.findIndex((machine)=> machine.id === event.machineId())
   const machineForRefill = this.machines[machineIndex]
   
   if (machineIndex !== -1){
    machineForRefill.stockLevel += event.refillQty(); 
    if (machineForRefill.stockLevel <3){
      this.publishService.publish(new LowStockWarningEvent(machineForRefill.id))
    } else {
      this.publishService.publish(new StockLevelOkEvent(machineForRefill.id))
    }
   }
   
  }
}

class StockWarningSubscriber implements ISubscriber{
  machines: Machine[]
  
  constructor(machines: Machine[]){
    this.machines = machines
  }

  handle(event: IEvent): void {
    if (event.type() === 'lowStockWarning'){
      console.log(`Low stock warning for machine ${event.machineId()}`)
    }
    if (event.type() === 'stockLevelOk'){
      console.log(`Stock level OK for machine ${event.machineId()}`)
    }
  }
}

// objects
class Machine {
  public stockLevel = 10;
  public id: string;

  constructor (id: string) {
    this.id = id;
  }
}


// helpers
const randomMachine = (): string => {
  const random = Math.random() * 3;
  if (random < 1) {
    return '001';
  } else if (random < 2) {
    return '002';
  }
  return '003';

}

const eventGenerator = (): IEvent => {
  const random = Math.random();
  if (random < 0.5) {
    const saleQty = Math.random() < 0.5 ? 1 : 2; // 1 or 2
    return new MachineSaleEvent(saleQty, randomMachine());
  } 
  const refillQty = Math.random() < 0.5 ? 3 : 5; // 3 or 5
  return new MachineRefillEvent(refillQty, randomMachine());
}


// program
(async () => {
  // create 3 machines with a quantity of 10 stock
  const machines: Machine[] = [ new Machine('001'), new Machine('002'), new Machine('003') ];
  
  const pubSubService: PublishSubscribeService = new PublishSubscribeService(); // implement and fix this
  
  // create a machine sale event subscriber. inject the machines (all subscribers should do this)
  const saleSubscriber = new MachineSaleSubscriber(pubSubService,machines);
  const refillSubscriber = new MachineRefillSubscriber(pubSubService,machines);
  const warningSubscriber = new StockWarningSubscriber(machines);
  
  // create the PubSub service
  pubSubService.subscribe('sale', saleSubscriber);
  pubSubService.subscribe('machineRefill', refillSubscriber);
  pubSubService.subscribe('lowStockWarning', warningSubscriber);
  pubSubService.subscribe('stockLevelOk', warningSubscriber);
  
  
  // create 5 random events
  const events = [1,2,3,4,5].map(i => eventGenerator());
  
  // publish the events
  events.map(event=>{
    pubSubService.publish(event)
    console.log('event', event)
    console.log(machines.map(machine=>`Machine ${machine.id} has stock level of ${machine.stockLevel}`))
  });



})();


