
const axios = require('axios');

/**
 * Array com os ids dos deputados de 2019
 */
const ids = [];

const dadosDeputados = []

/**
 * Array de objetos com as data indenizatorias
 * e o id de deputado
 */
const datasArray = []

/**
 * Array de objetos com as data indenizatorias
 * e o id de deputado somente do ano de 2019
 */

const deputadosPorMes = {};
const top5DeputadosPorMes = {};

async function main() {
    console.log('Pegando os Ids dos deputados do ano de 2019')
    await getIds();
    console.log('Ids coletados com sucesso!')
    console.log('Vamos obter as data de indenização de todos deputados(id) isso pode demorar levar um tempo')
    await getDatas(dadosDeputados);
    console.log(datasArray)
    console.log('Datas coletadas com sucesso!')
    console.log('Vamos oberter os valores de reembolso aguarde...')

    calcularESalvarTop5();
    console.log(top5DeputadosPorMes);
    
}





/**
 * Função para pegar todos os IDS dos deputados
 * que Exerceram mandato em 2019
 */
const getIds = async ()=> {
    try {
        const response = await axios.get('https://dadosabertos.almg.gov.br/ws/deputados/proposicoes/sumario?ini=20190101&fim=20200101&formato=json');

        const data = response.data
        data.list.forEach((item) => {
            dadosDeputados.push({id: item.id, nome: item.nome})
        })
        console.log('Ids dos deputados de 2019 extraido com sucesso!')
    } catch (error) {
        
    }
}



/**
 * Função para pegar as datas de verbas indenizatorias
 * de cada deputado pelo seu Id de deputado no ano de 1019
 */
const getDatas =  async (queue) => {
    for(const item of queue) {

        try {
            const response = await axios.get(`https://dadosabertos.almg.gov.br/ws/prestacao_contas/verbas_indenizatorias/deputados/${item.id}/datas?formato=json`);
            datasArray.push(...response.data.list)
            
            await sleep(1000);

            const datas2019 = datasArray.filter(obj => obj.dataReferencia["$"].startsWith("2019"));
            await getReembolso(datas2019, item.nome);
            console.log(deputadosPorMes)
            
        } catch (error) {
            console.log(`Erro ao processar ID: ${item.id} - ${error.message}`)
        }
        

    }

    

}


/**
 * Função que realiza um delay nas requisição
 */

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}


/**
 * Função para pegar os dados dos valores reembolsados
 * pelo ID do deputado e ANO e MES da indenização
 */
const getReembolso = async (queue, nome) => {
    for (const data of queue) {

        /**
         * Extraindo id do deputado
         * ano e mes usando substring
         */
        const id = data.idDeputado;
        const ano = data.dataReferencia["$"].substring(0, 4);
        const mes = data.dataReferencia["$"].substring(5, 7);

        const response = await axios.get(`https://dadosabertos.almg.gov.br/ws/prestacao_contas/verbas_indenizatorias/deputados/${id}/${ano}/${mes}?formato=json`);
        const detalhe = response.data.list[0].listaDetalheVerba;
        

        
        // const getNome = await axios.get(`https://dadosabertos.almg.gov.br/ws/deputados/${id}?formato=json`);
        // const nome = getNome.data.deputado.nome
        

        let reembolsoTotal = 0;

        /**
         * Itera sobre os detalhes de reembolso para calcular o valor total
         */
        for (const item of detalhe) {
            reembolsoTotal += item.valorReembolsado;
        }
        
        /**
         * Verifica se ha um objeto para este mes no objeto deputadosPorMes
         */
        if (!deputadosPorMes[mes]) {
            deputadosPorMes[mes] = {};
        }
  
        /**
         * Inicializa o valor de reembolso para este deputado neste mes caso não exista
         */
        if (!deputadosPorMes[mes][nome]) {
            deputadosPorMes[mes][nome] = 0;
        }
  
        // Soma o valor total de reembolso ao total para este deputado neste mês
        deputadosPorMes[mes][nome] += reembolsoTotal;

        
        await sleep(1000);

    }

}



const calcularESalvarTop5 = async () => {
    // Inicializa um objeto vazio para armazenar os top 5 deputados por mês
    
  
    // Itera pelos meses no objeto deputadosPorMes
    for (const mes in deputadosPorMes) {
      if (deputadosPorMes.hasOwnProperty(mes)) {
        // Obtém o objeto de gastos para o mês atual
        const deputadosGastos = deputadosPorMes[mes];
  
        // Converte o objeto de gastos em uma matriz de pares chave-valor
        const gastosArray = Object.entries(deputadosGastos);
  
        // Classifica a matriz em ordem decrescente com base nos valores (gastos)
        gastosArray.sort((a, b) => b[1] - a[1]);
  
        // Pega os cinco primeiros deputados
        const top5 = gastosArray.slice(0, 5);
  
        // Armazena os top 5 deputados para este mês no novo objeto
        top5DeputadosPorMes[mes] = top5;
        
        // Agora, vamos salvar esses dados no banco de dados (por exemplo, usando Sequelize)
        // for (const [nomeDeputado, valorTotal] of top5) {
        //   await TopDeputado.create({
        //     mes,
        //     nomeDeputado,
        //     valorTotal,
        //   });
        // }
      }
    }
  
    // Agora, top5DeputadosPorMes contém os top 5 deputados para cada mês
    // Eles também foram salvos no banco de dados usando TopDeputado.create
  };

main();
