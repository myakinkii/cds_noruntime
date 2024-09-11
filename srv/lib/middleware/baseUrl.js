module.exports = adapter => {
  const { service } = adapter

  const [{ kind, path}] = service.endpoints // stolen from our cds_init

  return function odata_parse_url(req, _, next) {

    req.baseUrl = path // we need it to properly calc service path and relative odata url

    // express used routers path to set baseUrl for that
    // but nest does not do that anymore https://github.com/nestjs/nest/issues/630#issuecomment-387033169

    next()
  }
}
