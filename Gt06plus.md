O Arquivo Gt06ProtocolDecoder.java dentro da pasta /build-traccar/traccar trata da decodificação do protocolo GT06.
esses logs abaixo são de um dispositivo com sensor de porta:
root@autoram:~/build-traccar/traccar# tail -f /opt/traccar/logs/tracker-server.log | grep --line-buffered "T25c3e585"
2026-01-21 14:32:28  INFO: [T25c3e585: gt06 < 187.32.97.119] 7979000794050100acd8490d0a
2026-01-21 14:32:31  INFO: [T25c3e585: gt06 < 187.32.97.119] 787829261a01150e201bcf00c268c20473d0f30018000902d402000000000046060310010000000000adca6e0d0a
2026-01-21 14:32:31  INFO: [T25c3e585: gt06 > 187.32.97.119] 7878052600ad39840d0a
2026-01-21 14:32:31  INFO: [T25c3e585] id: 862092062364371, time: 2026-01-21 14:31:59, lat: -7.07822, lon: -41.49944, course: 0.0
2026-01-21 14:32:34  INFO: [T25c3e585] id: 862092062364371, time: 2026-01-21 14:32:27, lat: -7.07822, lon: -41.49944, course: 0.0
2026-01-21 14:32:36  INFO: [T25c3e585: gt06 < 187.32.97.119] 7979000794050400aec2e60d0a
2026-01-21 14:32:39  INFO: [T25c3e585] id: 862092062364371, time: 2026-01-21 14:32:27, lat: -7.07822, lon: -41.49944, course: 0.0
2026-01-21 14:32:42  INFO: [T25c3e585: gt06 < 187.32.97.119] 7979000794050100afead20d0a
2026-01-21 14:32:44  INFO: [T25c3e585: gt06 < 187.32.97.119] 787829261a01150e2029cf00c268c40473d0f60018000902d402000000000046060310010000000000b061730d0a
2026-01-21 14:32:44  INFO: [T25c3e585: gt06 > 187.32.97.119] 7878052600b0f2e00d0a
2026-01-21 14:32:45  INFO: [T25c3e585] id: 862092062364371, time: 2026-01-21 14:32:27, lat: -7.07822, lon: -41.49944, course: 0.0
2026-01-21 14:32:47  INFO: [T25c3e585] id: 862092062364371, time: 2026-01-21 14:32:41, lat: -7.07822, lon: -41.49944, course: 0.0
2026-01-21 14:32:47  INFO: [T25c3e585: gt06 < 187.32.97.119] 7979000794050400b12a900d0a
2026-01-21 14:32:50  INFO: [T25c3e585: gt06 < 187.32.97.119] 7979000794050100b221b60d0a
2026-01-21 14:32:50  INFO: [T25c3e585] id: 862092062364371, time: 2026-01-21 14:32:41, lat: -7.07822, lon: -41.49944, course: 0.0
2026-01-21 14:32:53  INFO: [T25c3e585: gt06 < 187.32.97.119] 787829261a01150e2031cf00c268c30473d0f30018000902d402000000000046060310010000000000b3229b0d0a
2026-01-21 14:32:53  INFO: [T25c3e585: gt06 > 187.32.97.119] 7878052600b3c07b0d0a
2026-01-21 14:32:53  INFO: [T25c3e585] id: 862092062364371, time: 2026-01-21 14:32:41, lat: -7.07822, lon: -41.49944, course: 0.0
2026-01-21 14:32:56  INFO: [T25c3e585] id: 862092062364371, time: 2026-01-21 14:32:49, lat: -7.07822, lon: -41.49944, course: 0.0
2026-01-21 14:33:02  INFO: [T25c3e585: gt06 < 187.32.97.119] 787826221a01150e203bcf00c268c20473d0f300d80002d40200000000000100000000000000b4442e0d0a
2026-01-21 14:33:02  INFO: [T25c3e585: gt06 > 187.32.97.119] 7878052200b4d7a50d0a
2026-01-21 14:33:05  INFO: [T25c3e585] id: 862092062364371, time: 2026-01-21 14:32:59, lat: -7.07822, lon: -41.49944, course: 0.0

a pouco foi realizado uma modificação no decoder do protocolo GT06 para ele poder interpretar o status de porta aberta e fechada.
quando o fio referente a porta esta aterrado, na aba sharedDetails o atributo door não aparece, e quando o fio referente a porta não está aterrado o atributo door aparece com valor sharedUnknown.

a proposta é que o usuário da plataforma escolha entre duas opções, 1 quando o fio estiver aterrado eu quero que apareça um indicativo juntamente com um alerta de porta aberta e quando o fio estiver desaterrado apareça um indicativo de porta fechada, 2 sento a situação inversa. 

além dessa questão quero que seja ajustado o sharedUnknown que aparece como valor em alguns atributos no sharedDetails.