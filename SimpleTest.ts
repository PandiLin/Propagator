// import { isNumber } from "effect/Predicate";
import { Cell, test_cell_content } from "./Cell/Cell";
import { do_nothing, kick_out, monitor_change, observe_cell, tell } from "./ui";
import { force_load_arithmatic } from "./Cell/GenericArith";
import { c_add, c_multiply, p_add, p_amb, p_multiply } from "./BuiltInProps";
import { execute_all_tasks_sequential, steppable_run_task, summarize_scheduler_state } from "./Scheduler";
import { compact } from "fp-ts/lib/Compactable";
import { PublicStateCommand, set_global_state } from "./PublicState";
import { merge_value_sets } from "./DataTypes/ValueSet";
import { make_better_set } from "generic-handler/built_in_generics/generic_better_set";
import { combine_latest } from "./Reactivity/Reactor";

force_load_arithmatic();

set_global_state(PublicStateCommand.SET_CELL_MERGE, merge_value_sets)



const log_in_console = observe_cell((str: string) => console.log(str));

monitor_change(do_nothing, log_in_console);

// const x = new Cell("x");
// const y = new Cell("y");
// const product = new Cell("product");

// c_multiply(x, y, product);



// tell(x, 8, "fst");


// tell(y, 40, "snd");


// execute_all_tasks_sequential((error: Error) => {
// })






const x = new Cell("x");
const y = new Cell("y");
const z = new Cell("z"); 


// // const x2 = new Cell("x2");
// // const y2 = new Cell("y2");
// // const z2 = new Cell("z2");

// // const possibilities = make_better_set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

// // p_amb(x, possibilities)
// // p_amb(y, possibilities) 
// // p_amb(z, possibilities) 

// // p_multiply(x, x, x2)
// // p_multiply(y, y, y2)
// // p_multiply(z, z, z2) 

// // p_add(x2, y2, z2) 

// // execute_all_tasks_sequential(() => {
// //     console.log("done")
// // })

c_multiply(x, y, z)

tell(x, 8, "fst")
tell(y, 20, "snd")
tell(z, 5, "trd")

execute_all_tasks_sequential(() => {
    console.log("done")
})

// combine_latest(x.getStrongest(), y.getStrongest()).subscribe(([x_strongest, y_strongest]) => {
//     console.log("strongest", x_strongest, y_strongest)
//     // tell(z, x_strongest + y_strongest, "trd")
// })

// for (let i = 0; i < 10; i++){
//     console.log(i)
//     console.log(summarize_scheduler_state())
//     steppable_run_task((e) => {
//         console.log("error:", e)
//     })
// }


// const product = new Cell("product");






// c_multiply(x, y, product);

// tell(x, 8, "fst");


// tell(product, 40, "snd");


// await execute_all_tasks_sequential(() => {
//     console.log("error")
// }).task

// tell(x, 9, "c")

// await execute_all_tasks_sequential(() => {
//     console.log("error")
// }).task
  
// kick_out("c")

// await execute_all_tasks_sequential(() => {
//     console.log("error")
// }).task



// execute_all_tasks_sequential(() => {}, () => {
//     console.log("done1")
//     tell(x, 9, "c")
//     console.log("told x 9")


//     for (let i = 0; i < 10; i++){
//         console.log(i)
//         console.log(summarize_scheduler_state())
//         steppable_run_task((e) => {
//             console.log("error:", e)
//         })
//     }
//     console.log(summarize_scheduler_state())


//     kick_out("c") 

//     for (let i = 0; i < 10; i++){
//         console.log("kick out", i)
//         console.log(summarize_scheduler_state())
//         steppable_run_task((e) => {
//             console.log("error:", e)
//         })
//     }
// })



