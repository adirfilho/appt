import apptEcosystem from './appt.ecosystem'

export class ApptModuleEntity {
   constructor(private args){}
   
   importModules(): Promise<any>{
      return new Promise(resolve => {
            let importablePromises = [];

            if(this.args && this.args.import){
                  importablePromises = this.args.import.map(importable => {
                        const ApptEntity = apptEcosystem.getEntity(importable);
                        return new ApptEntity();
                  })                  
            }

            resolve(Promise.all(importablePromises))
            // return Promise.all(importablePromises).then(() => resolve())
      });
   }

   declareComponents(): Promise<any>{      
      return new Promise(resolve => {
            let declarablePromises = [];

            if(this.args && this.args.declare){
                  declarablePromises =  this.args.declare.map(declarable => {
                        const ApptEntity = apptEcosystem.getEntity(declarable);
                        return new ApptEntity();
                  }) 
            }
      
            resolve(Promise.all(declarablePromises))
            // return Promise.all(declarablePromises).then(() => resolve())
      });
   }
}

export default function ApptModule(decoratorArgs?): any  {
   return function decorator(Target) {
      return function(args?){
         const apptModuleEntity = new ApptModuleEntity(decoratorArgs);

         return apptModuleEntity
            .importModules()
            .then(() => apptModuleEntity.declareComponents())
            .then(() => {
                  if(decoratorArgs && decoratorArgs.extends){
                        return new decoratorArgs.extend.type().exec(decoratorArgs.extends.config);
                  }                        

                  return;
            })
            .then(res => new Target(res))
            .catch(res => new Target())
      };
   }
}